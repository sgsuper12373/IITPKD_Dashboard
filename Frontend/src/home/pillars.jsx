/* The six pillars: copy, icon, which figures to preview, and public sub-pages to jump to. */

export const PILLARS = [
  {
    id: 'people-campus', path: '/people-campus', icon: '🌿', metrics: ['faculty', 'students'], sub: [],
    title: <><u>People</u> &amp; Campus</>,
    vision: ['Be a diverse and inclusive community', 'Promote wellness and personal development among our community', 'Nourish strong ties with our alumni', 'Achieve a net-zero carbon campus by 2040'],
  },
  {
    id: 'research', path: '/research', icon: '🔬', metrics: ['publications', 'patents', 'funding'], sub: [],
    title: <u>Research</u>,
    vision: ['Be at the forefront of both applied research and blue sky research', 'Nurture a collaborative ecosystem for interdisciplinary and transdisciplinary inquiry', 'Develop state-of-the-art research infrastructure accessible to institutions and industries', 'Provide solutions that sustain ecologically sensitive regions, with emphasis on our neighbourhood'],
  },
  {
    id: 'education', path: '/education', icon: '🎓', metrics: ['students', 'placement', 'nirf'], sub: [],
    title: <u>Education</u>,
    vision: ['Design programmes that prepare students for a leading role in an ever-changing world', 'Provide broad-based, flexible and rigorous undergraduate education', 'Offer rigorous masters & doctoral programmes attuned to industry and academia', 'Be flexible and innovative in teaching practices catering to diverse learning needs', 'Promote hands-on and research-based learning'],
  },
  {
    id: 'industry-connect', path: '/industry-connect', icon: '🏭', metrics: ['funding'], sub: [],
    title: <><u>Industry</u> Connect</>,
    vision: ['Synergize R&D goals with industry and be a technological solution provider', 'Champion academic initiatives that benefit from mutual knowledge exchange', 'Offer opportunities for students to become industry-ready professionals', "Leverage proximity to an industrial corridor to contribute to India's self-reliance mission"],
  },
  {
    id: 'innovation', path: '/innovation-entrepreneurship', icon: '💡', metrics: ['startups'],
    sub: [
      { label: 'Facilities', path: '/innovation-entrepreneurship/iptif/facilities' },
      { label: 'Startup portfolio', path: '/innovation-entrepreneurship/startup-portfolio' },
      { label: 'Home Ground Startup', path: '/innovation-entrepreneurship/home-ground-startup' },
    ],
    title: <u>Innovation &amp; Entrepreneurship</u>,
    vision: ['Build a vibrant ecosystem spanning ideation, prototyping, product development and incubation', 'Foster a culture of innovation; encourage students, staff and faculty to take ideas to market', 'Connect innovation activities to solve societal challenges'],
  },
  {
    id: 'outreach', path: '/outreach-extension', icon: '🌱', metrics: [],
    sub: [
      { label: 'Social engagement', path: '/outreach-extension/social-engagement' },
      { label: 'Students engagement', path: '/outreach-extension/students-engagement' },
    ],
    title: <u>Outreach &amp; Extension</u>,
    vision: ['Be actively engaged with the local community', 'Partner with local organisations to strengthen public engagement with science and technology', 'Inspire young minds to dream big and nurture them in their pursuits', 'Be a hub for continuing education and skill development'],
  },
];
