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
    {
      id: 'c1',
      name: 'Osama',
      children: [
        { id: 'osama-karim', name: 'Karim', children: [] },
        { id: 'osama-momen', name: 'Momen', children: [] },
      ],
    },
    {
      id: 'c2',
      name: 'Nessrin',
      children: [
        { id: 'nessrin-faisal', name: 'Faisal', children: [] },
        { id: 'nessrin-adham', name: 'Adham', children: [] },
        { id: 'nessrin-bassam', name: 'Bassam', children: [] },
      ],
    },
    {
      id: 'c3',
      name: 'Mohamed',
      children: [
        { id: 'mohamed-shahd', name: 'Shahd', children: [] },
        { id: 'mohamed-zeyad', name: 'Zeyad', children: [] },
        { id: 'mohamed-moaz', name: 'Moaz', children: [] },
      ],
    },
  ],
};
