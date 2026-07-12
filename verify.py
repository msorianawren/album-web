import zipfile, os, re
zf = zipfile.ZipFile("album.zip")
names = zf.namelist()
print("Top 50 names:\n" + "\n".join(names[:50]))
top = {n.split("/")[0] for n in names if "/" in n}
bad = []
for n in names:
    parts = n.split("/")
    if n.startswith("/") or "\\" in n or "\x00" in n or ".." in parts or re.match(r"^[A-Za-z]:", n):
        bad.append(n)
root_files = [n for n in names if "/" not in n.rstrip("/") and not n.endswith("/")]
print("\nTOP_LEVEL_FOLDERS:", top)
print("ROOT_FILES:", root_files)
print("BAD_PATHS:", bad)
assert len(top) == 1, "ZIP must contain exactly one top-level folder"
assert not root_files, "ZIP must not contain root-level files"
assert not bad, "ZIP contains unsafe paths"
print("ALL OK")
