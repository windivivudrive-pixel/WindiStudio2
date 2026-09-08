// Decorative, repeating pixel terrain; stays in normal footer flow.
export function PixelLandscape(){
  return <div className="pixel-landscape" aria-hidden="true">
    <svg className="pixel-bush bush-left" viewBox="0 0 60 28" shapeRendering="crispEdges"><path fill="#17351b" d="M0 28V18h4v-6h6V6h6V2h12v4h6v8h8v-4h10v4h4v6h4v8z"/><path fill="#64a919" d="M2 28v-8h4v-6h6V8h6V4h8v4h6v12h10v-8h8v4h4v6h4v6z"/><path fill="#8bce21" d="M8 18v-4h6V8h6V6h6v4h4v8h-8v4H12v-4zM44 16h6v6h-6z"/></svg>
    <svg className="pixel-bush bush-right" viewBox="0 0 60 28" shapeRendering="crispEdges"><path fill="#17351b" d="M0 28V18h4v-6h6V6h6V2h12v4h6v8h8v-4h10v4h4v6h4v8z"/><path fill="#64a919" d="M2 28v-8h4v-6h6V8h6V4h8v4h6v12h10v-8h8v4h4v6h4v6z"/><path fill="#8bce21" d="M8 18v-4h6V8h6V6h6v4h4v8h-8v4H12v-4z"/></svg>
    <div className="pixel-grass"/>
  </div>;
}
