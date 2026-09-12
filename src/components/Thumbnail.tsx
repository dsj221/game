import { useState } from "react";
import { getBuildingIcon } from "../data/buildingIcons";
import {roadStyles} from '../data/roads';

export function Thumbnail({ type, modelType = type, size = 256 }: { type: string; modelType?: string; size?: 256 | 512 }) {
  const src = getBuildingIcon(type, size);
  const [failedSrc, setFailedSrc] = useState<string>();
  if (src && failedSrc !== src) {
    return <img className="thumbnail building-icon" src={src} width={size} height={size} alt="" aria-hidden="true" decoding="async" draggable={false} onError={() => setFailedSrc(src)} />;
  }
  return <FallbackThumbnail type={modelType} />;
}

function FallbackThumbnail({ type }: { type: string }) {
  if(type === 'watermill')return <svg viewBox="0 0 100 86" className="thumbnail" aria-hidden="true"><path d="M4 58 48 37 96 59 51 83Z" fill="#76aaa5"/><path d="M19 30 44 18 67 31v33L44 75 19 61Z" fill="#eadcc0"/><path d="M13 31 37 7 73 30 47 45Z" fill="#357d7a"/><circle cx="66" cy="55" r="21" fill="#af8250" stroke="#715138" strokeWidth="5"/><circle cx="66" cy="55" r="7" fill="#715138"/><path d="M66 35v40M46 55h40M52 41l28 28M52 69l28-28" stroke="#715138" strokeWidth="3"/></svg>;
  if(roadStyles[type])return <svg viewBox="0 0 100 86" className="thumbnail" aria-hidden="true"><path d="M6 43 50 18 94 43 50 70Z" fill={roadStyles[type].color}/><path d="m6 43 44 27 44-27v7L50 77 6 50Z" fill="#7b705a"/><path d="m24 33 44 26m-26-36 44 26M24 54l44-26M40 64l44-26" stroke="#e2d4b9" strokeWidth="2"/></svg>;
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
