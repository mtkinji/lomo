import { fireEvent, render } from '@testing-library/react-native';
import { ImportEvidenceViewer } from './ImportEvidenceViewer';

describe('Import evidence viewer',()=>{it('shows uncertain source evidence and supports retry without hiding warnings',()=>{const retry=jest.fn();const screen=render(<ImportEvidenceViewer evidence={{fields:[{fieldPath:'yieldQuantity',sourceArtifactId:'a',sourceRegion:null,sourceText:'Serves a crowd',confidence:.42,warning:'Exact yield is unclear'}]}} warnings={['Review the serving count.']} expiresAt="2026-08-12T12:00:00.000Z" onRetry={retry}/>);expect(screen.getByText('Exact yield is unclear')).toBeTruthy();expect(screen.getByText('“Serves a crowd”')).toBeTruthy();fireEvent.press(screen.getByText('Retry source'));expect(retry).toHaveBeenCalled();});});
