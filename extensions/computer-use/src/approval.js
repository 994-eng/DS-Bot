// Privileged computer-use calls stop here. The default decider denies them.
// A desktop approval card can replace the decider later; this module does not
// talk to DeepSeek Harness.

export class ApprovalDenied extends Error {
  constructor(id) {
    super(`Approval denied for ${id}.`)
    this.name = 'ApprovalDenied'
    this.code = 'approval_denied'
    this.privilege = id
  }
}

const SPACESD = {
  'ComputerService/GetClipboard': 'clipboard.read',
  'ComputerService/SetClipboard': 'clipboard.write',
}

const CDP = {
  'Network.getCookies': 'cookies.read',
  'Network.getAllCookies': 'cookies.read',
  'Storage.getCookies': 'cookies.read',
  'Runtime.evaluate': 'page.evaluate',
  'Page.printToPDF': 'download',
  'Browser.setDownloadBehavior': 'download',
}

export function classifySpacesd(method) {
  const id = SPACESD[method]
  if (!id) return { privileged: false, method }
  return { privileged: true, id, method }
}

export function classifyCdp(method, { raw = false } = {}) {
  if (raw) return { privileged: true, id: 'network.raw', method }
  const id = CDP[method]
  if (!id) return { privileged: false, method }
  return { privileged: true, id, method }
}

export function classifyLaunch() {
  return { privileged: true, id: 'display.launch', method: 'display.launch' }
}

export class ApprovalGate {
  constructor(decide = async () => false) {
    this.decide = decide
  }

  async allow(check) {
    if (!check?.privileged) return { allowed: true, privileged: false }
    const allowed = await this.decide(check)
    if (!allowed) throw new ApprovalDenied(check.id)
    return { allowed: true, privileged: true, id: check.id }
  }
}
