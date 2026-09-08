// Original, code-native arcade duck. Discrete wing frames keep the 8-bit silhouette.
export function PixelDuck(){
  return <svg viewBox="0 0 32 32" width="96" height="96" fill="none" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
    <g className="duck-wing-up">
      <path fill="#10251f" d="M6 2h3v2h2v3h2v3h3v7H9v-3H7v-4H5V5h1z"/>
      <path fill="#fffdf0" d="M6 4h2v6h2v4h3v2h-3v-2H8v-4H6z"/>
      <path fill="#3672a4" d="M9 7h1v3h2v3h2v3h-2v-3h-2v-3H9z"/>
    </g>
    <path fill="#10251f" d="M20 6h6v2h2v8h-3v4h-3v3h-4v2H9v-1H4v-2H1v-3h4v-2h5v-3h8v-3h1V8h1z"/>
    <path fill="#168344" d="M21 7h4v2h2v5h-2v2h-5v-5h1z"/>
    <path fill="#72c845" d="M21 8h2v2h-1v4h-2v-3h1z"/>
    <path fill="#fffdf0" d="M24 8h2v5h-2z"/><path fill="#10251f" d="M25 10h1v2h-1z"/>
    <path fill="#f89255" d="M28 11h4v2h-2v2h-3v-2h1z"/>
    <path fill="#fffdf0" d="M19 15h7v2h-3v2h-3v-2h-1zM4 22h4v1h9v-1h5v2h-4v2H8v-1H4z"/>
    <path fill="#23537b" d="M9 18h9v3h-3v2H8v-2H6v-1h3z"/>
    <g className="duck-wing-down">
      <path fill="#10251f" d="M12 17h7v4h-3v3h-3v3h-3v3H6v-3h2v-4h2v-3h2z"/>
      <path fill="#fffdf0" d="M17 18h2v3h-3v3h-3v3h-3v2H7v-2h3v-3h3v-3h3z"/>
    </g>
    <path fill="#f89255" d="M18 25h2v2h2v2h-3v-2h-1zM23 23h2v2h2v2h-3v-2h-1z"/>
  </svg>;
}
