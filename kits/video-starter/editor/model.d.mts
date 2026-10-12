import type {EditorDocument, CaptionGroup} from './types';
export function moveBoundary(doc: EditorDocument, index: number, frame: number): EditorDocument;
export function editCaption(caption: CaptionGroup, text: string): CaptionGroup;
