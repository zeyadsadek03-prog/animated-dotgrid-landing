// Org chart data model. Name only — no titles. Scales to any depth/size.
export interface OrgNode {
  id: string;
  name: string;
  children: OrgNode[];
}

export const ORG_TREE: OrgNode = {
  id: 'root',
  name: 'Idris',
  children: [
    { id: 'c1', name: 'Osama', children: [] },
    { id: 'c2', name: 'Nessrin', children: [] },
    { id: 'c3', name: 'Mohamed', children: [] },
  ],
};
