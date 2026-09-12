import { Box } from '../buildings/Model';
import { pigments as p } from '../data/artDirection';
import { civicProjects } from '../systems/development';
import { useTownStore } from '../stores/useTownStore';
/** Additions live inside the host building's transform and survive save/load. */
export function CivicLandmark({ type }: { type: string }) {
  const projects = useTownStore(s => s.development?.projects);
  const project = civicProjects.find(item => item.building === type && projects?.includes(item.id));
  if (!project) return null;
  return <group name={`civic-landmark:${project.id}`}>
    {project.id === 'granary' ? <>
      <Box p={[-.31,.49,-.27]} s={[.27,.85,.27]} c={p.woodLight}/>
      <Box p={[-.31,.94,-.27]} s={[.34,.1,.34]} c={p.tile}/>
      {[0,1,2].map(i=><Box key={i} p={[.25,.15+i*.16,-.25]} s={[.3,.14,.25]} c={i%2?p.paper:p.woodLight}/>)}
    </> : project.id === 'craft' ? <>
      <Box p={[0,.94,-.29]} s={[.86,.09,.11]} c={p.tile}/>
      {[-.38,.38].map(x=><Box key={x} p={[x,.48,-.29]} s={[.07,.94,.07]} c={p.wood}/>)}
      <Box p={[0,.78,-.28]} s={[.42,.22,.06]} c={p.brick}/>
      <Box p={[0,.78,-.24]} s={[.26,.035,.012]} c={p.paper}/>
    </> : project.id === 'civic' ? <>
      <Box p={[0,1.24,0]} s={[.13,.42,.13]} c={p.wood}/>
      <Box p={[0,1.49,0]} s={[.34,.09,.3]} c={p.tile}/>
      <Box p={[0,1.27,.08]} s={[.16,.2,.03]} c={p.woodLight} glow={.15}/>
    </> : project.id === 'garden' ? <>
      {[-.4,.4].map(x=><Box key={x} p={[x,.46,.34]} s={[.055,.86,.055]} c={p.wood}/>)}
      <Box p={[0,.91,.34]} s={[.89,.07,.12]} c={p.tile}/>
      {[-.3,-.1,.1,.3].map((x,i)=><Box key={x} p={[x,.96,.34]} s={[.16,.13,.17]} c={i%2?'#bf7982':'#92a55a'}/>)}
    </> : <>
      {[-.38,.38].map(x=><group key={x}>
        <Box p={[x,1.12,0]} s={[.035,.68,.035]} c={p.wood}/>
        <Box p={[x,1.25,.025]} s={[.19,.34,.025]} c={p.brick}/>
        <Box p={[x,1.23,.045]} s={[.1,.025,.012]} c={p.paper}/>
      </group>)}
      <Box p={[0,1.04,0]} s={[.73,.12,.14]} c={p.tile}/>
    </>}
  </group>;
}
