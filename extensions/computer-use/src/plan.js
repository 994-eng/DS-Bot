// A deterministic planner for the accessibility tree. The Bot's own model still
// reads the screenshot; this plans a click and a type when the goal names them.

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  visit(node)
  for (const child of node.children ?? node.nodes ?? []) walk(child, visit)
}

export function findNamed(tree, name) {
  const want = String(name).toLowerCase()
  let found = null
  walk(tree, (node) => {
    if (found) return
    const label = String(node.name ?? node.label ?? node.title ?? '')
    if (label.toLowerCase() === want) found = node
  })
  return found
}

function center(bounds) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }
}

export function planDesktopGoal(goal, tree) {
  const steps = []
  const text = String(goal ?? '')
  const click = /click\s+"([^"]+)"/i.exec(text)
  if (click) {
    const node = findNamed(tree, click[1])
    if (!node?.bounds) return [{ error: `No control named ${click[1]}.` }]
    steps.push({
      method: 'ComputerService/Pointer',
      body: {
        click: {
          position: center(node.bounds),
          button: 'MOUSE_BUTTON_LEFT',
          count: 1,
        },
      },
      why: `Click ${click[1]}`,
    })
  }
  const typed = /type\s+"([^"]+)"/i.exec(text)
  if (typed) {
    steps.push({
      method: 'ComputerService/Keyboard',
      body: { type: { text: typed[1] } },
      why: 'Type the requested text',
    })
  }
  if (steps.length === 0) {
    steps.push({
      method: 'AccessibilityService/GetTree',
      body: {},
      why: 'Read the screen before acting',
    })
  }
  steps.push({
    method: 'ComputerService/Screenshot',
    body: { format: 'IMAGE_FORMAT_PNG' },
    why: 'Check the result',
  })
  return steps
}
