const ATOM_PREAMBLE_SIZE = 8;
const MAX_FTYP_ATOM_SIZE = 1048576;

interface Atom {
  kind: string;
  size: number;
  data: Buffer | Atom[];
}

function asciiToU32Be(chars: string): number {
  return Buffer.from(chars, "ascii").readUInt32BE(0);
}

function u32BeToAscii(u32: number): string {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(u32, 0);
  return buf.toString("ascii");
}

function readU32(cur: { pos: number }, buf: Buffer): number {
  const val = buf.readUInt32BE(cur.pos);
  cur.pos += 4;
  return val;
}

function readU64(cur: { pos: number }, buf: Buffer): number {
  const hi = buf.readUInt32BE(cur.pos);
  const lo = buf.readUInt32BE(cur.pos + 4);
  cur.pos += 8;
  return hi * 4294967296 + lo;
}

const SUBATOM_CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "dinf", "edts"]);

function hasSubatoms(kind: string): boolean {
  return SUBATOM_CONTAINERS.has(kind);
}

function parseAtoms(infile: Buffer, depth = 0): Atom[] {
  const atoms: Atom[] = [];
  const cur = { pos: 0 };
  const len = infile.byteLength;

  while (cur.pos < len) {
    if (len - cur.pos < 8) break;

    let atomSize = readU32(cur, infile);
    const atomKind = u32BeToAscii(readU32(cur, infile));
    let fwd: number;

    if (atomSize === 1) {
      atomSize = readU64(cur, infile);
      fwd = atomSize - ATOM_PREAMBLE_SIZE * 2;
    } else if (atomSize === 0) {
      // 0 means atom extends to end of file
      atomSize = len - cur.pos + ATOM_PREAMBLE_SIZE;
      fwd = len - cur.pos;
    } else {
      fwd = atomSize - ATOM_PREAMBLE_SIZE;
    }

    if (fwd < 0 || cur.pos + fwd > len) {
      break;
    }

    const subatoms = infile.subarray(cur.pos, cur.pos + fwd);
    const data = hasSubatoms(atomKind) && depth < 10 ? parseAtoms(subatoms, depth + 1) : subatoms;
    cur.pos += fwd;

    atoms.push({
      kind: atomKind,
      size: atomSize,
      data,
    });
  }

  return atoms;
}

function recurseFlattenAtoms(atoms: Atom[]): Buffer {
  const buffers: Buffer[] = [];

  for (const atom of atoms) {
    let payload: Buffer;
    if (Array.isArray(atom.data)) {
      payload = recurseFlattenAtoms(atom.data);
    } else {
      payload = atom.data;
    }

    const totalSize = ATOM_PREAMBLE_SIZE + payload.byteLength;
    if (totalSize > 0xffffffff) {
      const header = Buffer.alloc(16);
      header.writeUInt32BE(1, 0);
      header.writeUInt32BE(asciiToU32Be(atom.kind), 4);
      const actualSize = BigInt(16 + payload.byteLength);
      const hi = Number((actualSize >> BigInt(32)) & BigInt(0xffffffff));
      const lo = Number(actualSize & BigInt(0xffffffff));
      header.writeUInt32BE(hi, 8);
      header.writeUInt32BE(lo, 12);
      buffers.push(Buffer.concat([header, payload]));
    } else {
      const header = Buffer.alloc(8);
      header.writeUInt32BE(totalSize, 0);
      header.writeUInt32BE(asciiToU32Be(atom.kind), 4);
      buffers.push(Buffer.concat([header, payload]));
    }
  }

  return Buffer.concat(buffers);
}

function traverseAtoms(atoms: Atom[], callback: (atom: Atom) => void) {
  for (const atom of atoms) {
    if (Array.isArray(atom.data)) {
      traverseAtoms(atom.data, callback);
    }
    callback(atom);
  }
}

function updateChunkOffsets(moov: Atom) {
  if (!Array.isArray(moov.data)) return;
  const atoms = moov.data;

  // Flatten once to determine the exact size of moov
  const flattenedMoov = recurseFlattenAtoms([moov]);
  const moovSize = flattenedMoov.byteLength;

  traverseAtoms(atoms, (atom) => {
    if (!["stco", "co64"].includes(atom.kind) || !Buffer.isBuffer(atom.data)) {
      return;
    }

    const is64 = atom.kind === "co64";
    const entrySize = is64 ? 8 : 4;
    const entries = atom.data.readUInt32BE(4);
    const newData = Buffer.alloc(8 + entries * entrySize);
    atom.data.copy(newData, 0, 0, 8);

    for (let i = 0; i < entries; i++) {
      const cur = 8 + i * entrySize;
      if (is64) {
        const hi = BigInt(atom.data.readUInt32BE(cur));
        const lo = BigInt(atom.data.readUInt32BE(cur + 4));
        const oldVal = (hi << BigInt(32)) | lo;
        const newVal = oldVal + BigInt(moovSize);
        const newHi = Number((newVal >> BigInt(32)) & BigInt(0xffffffff));
        const newLo = Number(newVal & BigInt(0xffffffff));
        newData.writeUInt32BE(newHi, cur);
        newData.writeUInt32BE(newLo, cur + 4);
      } else {
        const oldVal = atom.data.readUInt32BE(cur);
        const newVal = oldVal + moovSize;
        if (newVal > 0xffffffff) {
          newData.writeUInt32BE(0xffffffff, cur);
        } else {
          newData.writeUInt32BE(newVal, cur);
        }
      }
    }

    atom.data = newData;
  });
}

/**
 * Re-orders MP4 / QuickTime atoms so `ftyp` is first and `moov` is placed
 * before `mdat`, enabling fast-start streaming on iOS Safari and modern browsers.
 */
export function faststart(infile: Buffer): Buffer {
  const atoms = parseAtoms(infile);
  const mdatIndex = atoms.findIndex((a) => a.kind === "mdat");
  const moovIndex = atoms.findIndex((a) => a.kind === "moov");

  if (mdatIndex === -1 || moovIndex === -1) {
    return infile;
  }

  if (moovIndex < mdatIndex) {
    // moov atom is already up front
    return infile;
  }

  const ftyp = atoms.find((a) => a.kind === "ftyp");
  if (!ftyp || ftyp.size > MAX_FTYP_ATOM_SIZE) {
    return infile;
  }

  const moov = atoms[moovIndex];
  updateChunkOffsets(moov);

  const sorted: Atom[] = [ftyp, moov];
  const rest = atoms.filter((a) => a.kind !== "ftyp" && a.kind !== "moov");
  sorted.push(...rest);

  return recurseFlattenAtoms(sorted);
}
