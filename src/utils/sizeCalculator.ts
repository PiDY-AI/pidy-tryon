import { Measurements, TryOnResult } from '@/types/measurements';

export const calculateSize = (measurements: Measurements): TryOnResult => {
  const { chest, waist, hips } = measurements;
  
  // Size chart (in cm)
  const sizeChart = {
    XS: { chest: [76, 84], waist: [60, 68], hips: [84, 92] },
    S: { chest: [84, 92], waist: [68, 76], hips: [92, 100] },
    M: { chest: [92, 100], waist: [76, 84], hips: [100, 108] },
    L: { chest: [100, 108], waist: [84, 92], hips: [108, 116] },
    XL: { chest: [108, 116], waist: [92, 100], hips: [116, 124] },
    XXL: { chest: [116, 124], waist: [100, 108], hips: [124, 132] },
  };

  let bestSize = 'M';
  let bestScore = 0;

  for (const [size, ranges] of Object.entries(sizeChart)) {
    let score = 0;
    let matches = 0;

    if (chest >= ranges.chest[0] && chest <= ranges.chest[1]) {
      score += 33;
      matches++;
    } else {
      const diff = Math.min(
        Math.abs(chest - ranges.chest[0]),
        Math.abs(chest - ranges.chest[1])
      );
      score += Math.max(0, 33 - diff * 2);
    }

    if (waist >= ranges.waist[0] && waist <= ranges.waist[1]) {
      score += 34;
      matches++;
    } else {
      const diff = Math.min(
        Math.abs(waist - ranges.waist[0]),
        Math.abs(waist - ranges.waist[1])
      );
      score += Math.max(0, 34 - diff * 2);
    }

    if (hips >= ranges.hips[0] && hips <= ranges.hips[1]) {
      score += 33;
      matches++;
    } else {
      const diff = Math.min(
        Math.abs(hips - ranges.hips[0]),
        Math.abs(hips - ranges.hips[1])
      );
      score += Math.max(0, 33 - diff * 2);
    }

    if (score > bestScore) {
      bestScore = score;
      bestSize = size;
    }
  }

  const fitNotes: string[] = [];
  const ranges = sizeChart[bestSize as keyof typeof sizeChart];

  if (chest < ranges.chest[0]) {
    fitNotes.push('Chest may be slightly loose');
  } else if (chest > ranges.chest[1]) {
    fitNotes.push('Chest may fit snugly');
  }

  if (waist < ranges.waist[0]) {
    fitNotes.push('Waist area will have extra room');
  } else if (waist > ranges.waist[1]) {
    fitNotes.push('Consider sizing up for waist comfort');
  }

  if (hips < ranges.hips[0]) {
    fitNotes.push('Hip area will be relaxed fit');
  } else if (hips > ranges.hips[1]) {
    fitNotes.push('Hip area may be form-fitting');
  }

  if (fitNotes.length === 0) {
    fitNotes.push('Great fit across all measurements!');
  }

  return {
    recommendedSize: bestSize,
    fitScore: Math.round(bestScore),
    fitNotes,
  };
};
