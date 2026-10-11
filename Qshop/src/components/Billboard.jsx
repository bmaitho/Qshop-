// Site-wide billboard: a single cinematic stage (split screen → full
// video → poster …) with slow crossfades. See hive/CinemaBillboard.
import CinemaBillboard from './hive/CinemaBillboard';

export default function Billboard({ linkTo, height, className }) {
  return <CinemaBillboard linkTo={linkTo} height={height} className={className} />;
}
