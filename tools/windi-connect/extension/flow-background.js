// Renderer focus is independent of OS/window focus. Never activate a browser
// window to make a background job work: unsupported browsers must fail visibly.
export async function withFlowBackground({tabId,cdp}, action) {
  try {
    await cdp('flow',tabId,'Emulation.setFocusEmulationEnabled',{enabled:true});
  } catch (cause) {
    throw new Error('FLOW_BACKGROUND_UNAVAILABLE', {cause});
  }
  try {
    return await action();
  } finally {
    // A closed tab or detached debugger already discards the override.
    await cdp('flow',tabId,'Emulation.setFocusEmulationEnabled',{enabled:false}).catch(()=>{});
  }
}
