

export type ZenCairnState = {
  seed: string;
  blocks: Array<{ x: number; width: number; color: string }>;
  movingBlock: { x: number; width: number; direction: number; color: string } | null;
  score: number;
  perfectDrops: number;
  tickCounter: number;
  complete: boolean;
};

const BASE_WIDTH = 40; // 40% of screen width
const BLOCK_SPEED = 0.55;

const STONE_COLORS = [
  "#6b705c", // Mossy green-grey
  "#a5a58d", // Light olive
  "#b7b7a4", // Warm grey
  "#ffe8d6", // Pale stone
  "#ddbea9", // Warm sandstone
  "#cb997e", // Terracotta
];

export function createZenCairnState(seed: string): ZenCairnState {
  const baseColor = STONE_COLORS[0];
  const nextColor = STONE_COLORS[1];
  
  return {
    seed,
    blocks: [{ x: 50, width: BASE_WIDTH, color: baseColor }],
    movingBlock: { x: 10, width: BASE_WIDTH, direction: 1, color: nextColor },
    score: 0,
    perfectDrops: 0,
    tickCounter: 0,
    complete: false,
  };
}

export function dropStone(state: ZenCairnState) {
  if (state.complete || !state.movingBlock) return;

  const topBlock = state.blocks[state.blocks.length - 1];
  const moving = state.movingBlock;

  const topLeft = topBlock.x - topBlock.width / 2;
  const topRight = topBlock.x + topBlock.width / 2;
  
  const movingLeft = moving.x - moving.width / 2;
  const movingRight = moving.x + moving.width / 2;

  const overlapLeft = Math.max(topLeft, movingLeft);
  const overlapRight = Math.min(topRight, movingRight);
  const overlapWidth = overlapRight - overlapLeft;

  if (overlapWidth <= 0) {
    // Complete miss
    state.complete = true;
    state.movingBlock = null; // disappears or falls
  } else {
    // Perfect match tolerance (if very close, snap to perfect)
    const diff = Math.abs(moving.x - topBlock.x);
    let newWidth = overlapWidth;
    let newX = overlapLeft + overlapWidth / 2;
    
    if (diff < 2.5) {
      newWidth = topBlock.width;
      newX = topBlock.x;
    }

    state.blocks.push({
      x: newX,
      width: newWidth,
      color: moving.color,
    });
    
    if (diff < 2.5) {
      state.score += 2;
      state.perfectDrops++;
    } else {
      state.score++;
    }

    // Spawn next block
    const nextColorIndex = (state.score + 1) % STONE_COLORS.length;
    const direction = state.score % 2 === 0 ? -1 : 1;
    const startX = direction === 1 ? 10 : 90;
    
    state.movingBlock = {
      x: startX,
      width: newWidth,
      direction,
      color: STONE_COLORS[nextColorIndex],
    };
  }
}

export function stepZenCairn(state: ZenCairnState) {
  if (state.complete || !state.movingBlock) return;

  state.tickCounter++;
  
  const speed = BLOCK_SPEED + (state.score * 0.05); // slightly increases over time

  state.movingBlock.x += speed * state.movingBlock.direction;

  if (state.movingBlock.x > 90) {
    state.movingBlock.x = 90;
    state.movingBlock.direction = -1;
  } else if (state.movingBlock.x < 10) {
    state.movingBlock.x = 10;
    state.movingBlock.direction = 1;
  }
}
