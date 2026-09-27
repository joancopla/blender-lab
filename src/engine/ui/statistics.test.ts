import { describe, expect, it } from 'vitest';
import { blenderDefaultScene } from '../scene/default-scene';
import { editClick, toggleEditMode } from '../operators/edit-mode';
import { statistics } from './statistics';

describe('Statistics overlay', () => {
  it('Object Mode: default scene', () => {
    expect(statistics(blenderDefaultScene())).toEqual([
      ['Objects', '1 / 3'],
      ['Vertices', '8'],
      ['Edges', '12'],
      ['Faces', '6'],
      ['Triangles', '12'],
    ]);
  });

  it('Edit Mode: selected / total of the edited meshes', () => {
    let s = toggleEditMode(blenderDefaultScene());
    expect(statistics(s)[1]).toEqual(['Vertices', '8 / 8']);
    s = editClick(s, { objectId: 'cube', ref: { kind: 'vert', index: 0 } }, false);
    expect(statistics(s).slice(1, 4)).toEqual([
      ['Vertices', '1 / 8'],
      ['Edges', '0 / 12'],
      ['Faces', '0 / 6'],
    ]);
  });
});
