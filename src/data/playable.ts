// Retired definitions remain readable only for legacy-save compatibility.
export const retiredBuildingTypes=new Set(['portal','endportal','core','netherplant','obsidian']);
export const isPlayableBuilding=(b:{type:string;world:string})=>b.world==='overworld'&&!retiredBuildingTypes.has(b.type);
