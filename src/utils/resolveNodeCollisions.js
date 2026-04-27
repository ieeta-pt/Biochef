import { defaultNodeHeight, defaultNodeWidth } from "../components/RecipePanel";

// taken and converted from:
// https://reactflow.dev/examples/layout/node-collisions

function getBoxesFromNodes(nodes, margin = 0) {
  const boxes = new Array(nodes.length);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    boxes[i] = {
      x: node.position.x - margin,
      y: node.position.y - margin,
      width: (node.width ?? node.measured?.width ?? defaultNodeWidth) + margin * 2,
      height: (node.height ?? node.measured?.height ?? defaultNodeHeight) + margin * 2,
      node,
      moved: false,
    };
  }

  return boxes;
}

export const resolveCollisions = (
  nodes,
  { maxIterations = 50, overlapThreshold = 0.5, margin = 0 } = {}
) => {
  const boxes = getBoxesFromNodes(nodes, margin);

  for (let iter = 0; iter <= maxIterations; iter++) {
    let moved = false;

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i];
        const B = boxes[j];

        // center positions
        const centerAX = A.x + A.width * 0.5;
        const centerAY = A.y + A.height * 0.5;
        const centerBX = B.x + B.width * 0.5;
        const centerBY = B.y + B.height * 0.5;

        // distance between centers
        const dx = centerAX - centerBX;
        const dy = centerAY - centerBY;

        // overlap on each axis
        const px = (A.width + B.width) * 0.5 - Math.abs(dx);
        const py = (A.height + B.height) * 0.5 - Math.abs(dy);

        // resolve collision if overlapping
        if (px > overlapThreshold && py > overlapThreshold) {
          A.moved = true;
          B.moved = true;
          moved = true;

          if (px < py) {
            // resolve x-axis
            const sx = dx > 0 ? 1 : -1;
            const moveAmount = (px / 2) * sx;
            A.x += moveAmount;
            B.x -= moveAmount;
          } else {
            // resolve y-axis
            const sy = dy > 0 ? 1 : -1;
            const moveAmount = (py / 2) * sy;
            A.y += moveAmount;
            B.y -= moveAmount;
          }
        }
      }
    }

    // stop early if stable
    if (!moved) {
      break;
    }
  }

  const newNodes = boxes.map((box) => {
    if (box.moved) {
      return {
        ...box.node,
        position: {
          x: box.x + margin,
          y: box.y + margin,
        },
      };
    }

    return box.node;
  });

  return newNodes;
};