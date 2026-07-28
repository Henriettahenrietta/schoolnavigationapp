// Mock campus data for the Smart Campus Navigation App prototype.
// Case institution: Yaounde International Business School (YIBS).
//
// This is the "data tier" of the prototype, held locally in the app for now.
// In the next phase it will be served by the Node.js/Express/MongoDB backend,
// where each building is a document with nested floors -> rooms/offices.
// The shape below mirrors that intended document structure exactly.

// Approximate geographic centre of the campus (Yaounde, Cameroon).
export const CAMPUS_CENTER = {
  latitude: 3.8642,
  longitude: 11.5174,
};

// Default map region (zoomed to campus scale).
export const CAMPUS_REGION = {
  ...CAMPUS_CENTER,
  latitudeDelta: 0.006,
  longitudeDelta: 0.006,
};

export const CATEGORIES = {
  ADMIN: 'Administration',
  ACADEMIC: 'Academic',
  LIBRARY: 'Library',
  ICT: 'ICT / Computer',
  SCIENCE: 'Science',
  SERVICE: 'Student Services',
  EVENT: 'Events',
};

// Each building: id, name, category, short description, coordinates, and
// an ordered list of floors. Each floor has an ordered list of rooms/offices.
export const BUILDINGS = [
  {
    id: 'admin-block',
    name: 'Main Administrative Block',
    category: CATEGORIES.ADMIN,
    description:
      "Houses the institution's central offices, including the Rector's Office, Registry, and Bursary.",
    latitude: 3.8646,
    longitude: 11.5171,
    floors: [
      {
        id: 'admin-g',
        name: 'Ground Floor',
        rooms: [
          { id: 'admin-reception', name: 'Reception & Enquiries', type: 'Office', description: 'First point of contact for visitors.' },
          { id: 'admin-registry', name: 'Registry', type: 'Office', description: 'Student records, transcripts, and certificates.' },
          { id: 'admin-bursary', name: 'Bursary', type: 'Office', description: 'Fees payment and financial matters.' },
        ],
      },
      {
        id: 'admin-1',
        name: 'First Floor',
        rooms: [
          { id: 'admin-rector', name: "Rector's Office", type: 'Office', description: 'Office of the Rector.' },
          { id: 'admin-dvc', name: 'Deputy Rector (Academics)', type: 'Office', description: 'Academic administration.' },
          { id: 'admin-boardroom', name: 'Boardroom', type: 'Meeting Room', description: 'Senate and management meetings.' },
        ],
      },
    ],
  },
  {
    id: 'business-faculty',
    name: 'Faculty of Business',
    category: CATEGORIES.ACADEMIC,
    description:
      'Main teaching block for business and management programmes, with lecture halls and departmental offices.',
    latitude: 3.8639,
    longitude: 11.5179,
    floors: [
      {
        id: 'bus-g',
        name: 'Ground Floor',
        rooms: [
          { id: 'lh-1', name: 'Lecture Hall 1', type: 'Lecture Hall', description: 'Capacity ~150. Used for large first-year classes.' },
          { id: 'lh-2', name: 'Lecture Hall 2', type: 'Lecture Hall', description: 'Capacity ~120.' },
          { id: 'bus-accounting', name: 'Dept. of Accounting', type: 'Office', description: 'Departmental office and staff room.' },
        ],
      },
      {
        id: 'bus-1',
        name: 'First Floor',
        rooms: [
          { id: 'lh-3', name: 'Lecture Hall 3', type: 'Lecture Hall', description: 'Capacity ~100.' },
          { id: 'bus-management', name: 'Dept. of Management', type: 'Office', description: 'Departmental office.' },
          { id: 'bus-marketing', name: 'Dept. of Marketing', type: 'Office', description: 'Departmental office.' },
          { id: 'bus-hod', name: 'HOD Boardroom', type: 'Meeting Room', description: 'Departmental meetings.' },
        ],
      },
    ],
  },
  {
    id: 'library',
    name: 'University Library',
    category: CATEGORIES.LIBRARY,
    description: 'Central library with reading rooms, an e-library, and study spaces.',
    latitude: 3.8644,
    longitude: 11.5180,
    floors: [
      {
        id: 'lib-g',
        name: 'Ground Floor',
        rooms: [
          { id: 'lib-circ', name: 'Circulation Desk', type: 'Service', description: 'Borrowing and returns.' },
          { id: 'lib-reading', name: 'Main Reading Room', type: 'Study Area', description: 'Quiet individual study.' },
        ],
      },
      {
        id: 'lib-1',
        name: 'First Floor',
        rooms: [
          { id: 'lib-elib', name: 'E-Library', type: 'Computer Room', description: 'Computers with internet access to online journals.' },
          { id: 'lib-group', name: 'Group Study Rooms', type: 'Study Area', description: 'Bookable rooms for group work.' },
        ],
      },
    ],
  },
  {
    id: 'ict-center',
    name: 'ICT & Computer Laboratory',
    category: CATEGORIES.ICT,
    description: 'Computer laboratories and the campus network / ICT support office.',
    latitude: 3.8636,
    longitude: 11.5169,
    floors: [
      {
        id: 'ict-g',
        name: 'Ground Floor',
        rooms: [
          { id: 'ict-lab1', name: 'Computer Lab 1', type: 'Laboratory', description: '40 workstations for practical classes.' },
          { id: 'ict-lab2', name: 'Computer Lab 2', type: 'Laboratory', description: '40 workstations.' },
          { id: 'ict-support', name: 'ICT Support Office', type: 'Office', description: 'Network and helpdesk support.' },
        ],
      },
    ],
  },
  {
    id: 'science-block',
    name: 'Science Laboratories',
    category: CATEGORIES.SCIENCE,
    description: 'Physics, chemistry, and biology laboratories.',
    latitude: 3.8650,
    longitude: 11.5178,
    floors: [
      {
        id: 'sci-g',
        name: 'Ground Floor',
        rooms: [
          { id: 'sci-chem', name: 'Chemistry Laboratory', type: 'Laboratory', description: 'Wet lab with fume cupboards.' },
          { id: 'sci-phy', name: 'Physics Laboratory', type: 'Laboratory', description: 'General physics practicals.' },
        ],
      },
      {
        id: 'sci-1',
        name: 'First Floor',
        rooms: [
          { id: 'sci-bio', name: 'Biology Laboratory', type: 'Laboratory', description: 'Microscopy and dissection.' },
          { id: 'sci-prep', name: 'Prep Room', type: 'Service', description: 'Laboratory preparation and storage.' },
        ],
      },
    ],
  },
  {
    id: 'student-center',
    name: 'Student Centre & Cafeteria',
    category: CATEGORIES.SERVICE,
    description: 'Cafeteria, student affairs office, and clinic.',
    latitude: 3.8635,
    longitude: 11.5177,
    floors: [
      {
        id: 'sc-g',
        name: 'Ground Floor',
        rooms: [
          { id: 'sc-cafe', name: 'Cafeteria', type: 'Service', description: 'Meals and refreshments.' },
          { id: 'sc-clinic', name: 'Campus Clinic', type: 'Service', description: 'First aid and basic health services.' },
          { id: 'sc-affairs', name: 'Student Affairs Office', type: 'Office', description: 'Welfare, ID cards, and complaints.' },
        ],
      },
    ],
  },
  {
    id: 'auditorium',
    name: 'Multipurpose Auditorium',
    category: CATEGORIES.EVENT,
    description: 'Main auditorium used for matriculation, seminars, and events.',
    latitude: 3.8648,
    longitude: 11.5165,
    floors: [
      {
        id: 'aud-g',
        name: 'Ground Floor',
        rooms: [
          { id: 'aud-hall', name: 'Main Auditorium', type: 'Hall', description: 'Seating capacity ~500.' },
          { id: 'aud-green', name: 'Green Room', type: 'Service', description: 'Backstage / speaker preparation.' },
        ],
      },
    ],
  },
];

// Convenience: a flat list of every room, each tagged with its building and
// floor. Used to power the campus-wide search.
export const ALL_ROOMS = BUILDINGS.flatMap((building) =>
  building.floors.flatMap((floor) =>
    floor.rooms.map((room) => ({
      ...room,
      buildingId: building.id,
      buildingName: building.name,
      floorId: floor.id,
      floorName: floor.name,
      latitude: building.latitude,
      longitude: building.longitude,
    }))
  )
);

export function getBuildingById(id) {
  return BUILDINGS.find((b) => b.id === id);
}
