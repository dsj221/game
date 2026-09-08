export function Thumbnail({ type }: { type: string }) {
  const mechanical = [
    "drill",
    "furnace",
    "slime",
    "generator",
    "core",
  ].includes(type);
  const c = mechanical
    ? "#71877c"
    : type === "portal" || type === "endportal"
      ? "#927ba4"
      : "#899b72";
  return (
    <svg viewBox="0 0 100 86" className="thumbnail" aria-hidden="true">
      <path d="M10 58 49 36 90 58 50 81Z" fill="#d0d6bf" />
      <path d="M10 58 50 81 50 86 10 63Z" fill="#b4bea3" />
      <path d="M50 81 90 58 90 63 50 86Z" fill="#a4b192" />
      {type === "tree" ? (
        <>
          <path d="M47 36h8v32h-8" fill="#987b56" />
          <path d="M25 23 50 8 76 23 50 39Z" fill="#9ab283" />
          <path d="M25 23 50 39 50 58 25 43Z" fill="#739365" />
          <path d="M50 39 76 23 76 43 50 58Z" fill="#577c54" />
        </>
      ) : (
        <>
          <path d="M25 34 50 20 77 35 51 50Z" fill="#d9d2b7" />
          <path d="M25 34 51 50 51 72 25 57Z" fill="#e4dcc0" />
          <path d="M51 50 77 35 77 57 51 72Z" fill="#b7baa2" />
          <path d="M19 35 44 10 82 33 55 53Z" fill={c} />
          <path d="M19 35 44 10 47 29 29 41Z" fill="#586e59" />
          <path d="M34 48 42 53 42 65 34 60Z" fill="#829380" />
          <path d="M59 52 69 46 69 56 59 62Z" fill="#617e68" />
          {mechanical && <path d="M65 25V9l8-4v25Z" fill="#6e7a6b" />}
        </>
      )}
    </svg>
  );
}
