import { createPortal } from 'react-dom';
import './hive.css';

// Overlays must escape the themed page's stacking context so the site's
// fixed navbars can never sit on top of them.
export default function Portal({ children }) {
  return createPortal(<div className="hive-portal">{children}</div>, document.body);
}
