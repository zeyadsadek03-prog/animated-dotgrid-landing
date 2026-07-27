// Org chart data model. Name only — no titles. Scales to any depth/size.
export interface OrgNode {
  id: string;
  name: string;
  children: OrgNode[];
}

export const ORG_TREE: OrgNode = {
  id: 'root',
  name: 'Aaron',
  children: [
    {
      id: 'c1',
      name: 'Brian',
      children: [
        { id: 'osama-karim', name: 'Cody', children: [] },
        { id: 'osama-momen', name: 'Derek', children: [] },
      ],
    },
    {
      id: 'c2',
      name: 'Elena',
      children: [
        { id: 'nessrin-faisal', name: 'Felix', children: [] },
        { id: 'nessrin-adham', name: 'Grace', children: [] },
        { id: 'nessrin-bassam', name: 'Hugo', children: [] },
      ],
    },
    {
      id: 'c3',
      name: 'Iris',
      children: [
        { id: 'mohamed-shahd', name: 'Julia', children: [] },
        { id: 'mohamed-zeyad', name: 'Kevin', children: [] },
        { id: 'mohamed-moaz', name: 'Liam', children: [] },
      ],
    },
  ],
};