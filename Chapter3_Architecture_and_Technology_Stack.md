## 3.6.1 System Architecture

As stated in Section 3.6, the application follows a three-tier architecture, a structure that separates the parts of the system responsible for interacting with the user, processing requests, and storing data. This separation is deliberate: it keeps the interface, the logic, and the data of the application reasonably independent of one another, so that a change in one tier, for example, adjusting how a route is displayed, does not require the other tiers to be rebuilt. This is consistent with the Systems Theory framing adopted in Chapter Two, in which the application is treated as a set of interrelated components (inputs, processes, outputs, and feedback) working toward the single goal of guiding a user to a destination.

The three tiers are described below.

The **client tier (mobile application)** is the part of the system the user sees and interacts with directly. It is responsible for displaying the campus map, accepting search queries, detecting the user's current position, and presenting the calculated route and the indoor floor-and-room directory. In Systems Theory terms, this tier collects the inputs (the user's location and chosen destination) and presents the outputs (the map and directions).

The **application tier (backend server)** sits between the mobile application and the database. It is responsible for the processing described in Chapter Two: receiving a search query from the mobile application, matching it against the stored campus data, retrieving the requested building, floor, or room, and returning the result. Placing this logic on a server, rather than inside the mobile application itself, means that campus data can be updated centrally without the user having to reinstall or update the app, which directly addresses the "maps quickly become outdated" limitation identified in Chapter One.

The **data tier (database)** stores the underlying campus information, that is, the buildings and their nested floors, rooms, and offices, together with the coordinates and descriptive details needed to locate and display each one. This is the data component referred to in the Systems Theory model.

*Table 4: Technology Stack by Architectural Tier*

| Tier | Purpose | Technologies Used |
|------|---------|-------------------|
| Client (Mobile App) | User interface: map display, search, positioning, indoor directory | React Native, React Navigation, react-native-maps with OpenStreetMap tiles, react-native-geolocation-service |
| Application (Backend) | Request handling, search matching, route/data retrieval | Node.js, Express.js, Mongoose |
| Data (Database) | Storage of buildings and nested floors, rooms, and offices | MongoDB |
| Development & Testing | Editing, API testing, version control | Visual Studio Code, Postman, Git and GitHub |

## 3.6.2 Justification of Technology Choices

The technologies selected for this project were chosen not only for their technical suitability but also for their fit with the two factors identified by the Technology Acceptance Model, namely perceived usefulness and perceived ease of use. A tool was preferred where it helped the application do its job correctly (usefulness) or helped keep the interface simple and responsive (ease of use), and, given that this is a final-year prototype, where it could be obtained and used without cost or specialized hardware.

### Client Tier

**React Native** was selected as the framework for the mobile application because it allows a single codebase to run on both Android and iOS devices. Since the population of students, staff, and visitors identified in Section 3.3 uses a mixture of both platforms, a cross-platform framework ensures the application is available to as many users as possible without the time cost of building two separate applications, an important consideration within the limited timeframe of the project. Its component-based structure also supports the simple, uncluttered interface that the Technology Acceptance Model associates with ease of use and adoption.

**React Navigation** manages movement between the different screens of the application, such as the home screen, the building-selection screen, the floor-and-room directory, and the search-results screen. A clear and predictable flow between screens supports perceived ease of use, since a user should be able to move toward their destination without becoming confused about where they are within the application.

**react-native-maps combined with OpenStreetMap tiles** provides the interactive outdoor map on which both the campus buildings and the route between the user and their destination are displayed. OpenStreetMap was chosen as the map source in preference to commercial alternatives because it does not require a paid billing account, which keeps the prototype free to develop and run, while still providing the searchable, zoomable, interactive map described in Section 2.1.6. This directly serves the perceived usefulness of the application, since the map and the visible route are the core means by which a user is guided to a destination.

**Plain React Native components** are used to build the indoor, floor-by-floor room directory that is shown once a building has been selected. Because reliable indoor positioning is difficult to achieve with GPS (a limitation acknowledged in Section 2.1.5), the application does not attempt to track the user's exact position inside a building. Instead, it presents a clear directory of floors and rooms, which is a realistic and dependable way to help a user find an office indoors within the scope of a student project.

**react-native-geolocation-service** detects the user's current position outdoors using the device's GPS receiver. This provides the "current location" input required by the Systems Theory model, and is what allows the application to draw a route from where the user actually is, rather than from a fixed starting point, which is the feature that most clearly distinguishes the application from a static printed map.

### Application Tier

**Node.js** serves as the runtime environment in which the backend server runs. It was chosen partly because it uses JavaScript, the same language as the React Native mobile application, which reduces the number of separate languages the researcher must work in and makes the overall system simpler to develop and maintain.

**Express.js** is used to build the application programming interface (API), that is, the set of endpoints through which the mobile application requests information, such as listing all buildings, listing the floors and rooms of a selected building, or handling a search query. Express provides a straightforward and widely used way to define these endpoints, which supports the maintainability aim expressed in Section 3.6.

**Mongoose** connects the Node.js and Express backend to the MongoDB database and is used to define the schema, that is, the expected structure of the stored data. By enforcing a consistent structure for each building and its nested floors and rooms, Mongoose helps keep the campus data orderly and reliable, which in turn supports the correctness on which the application's perceived usefulness depends.

### Data Tier

**MongoDB** stores the campus information as documents. It was selected because its document-oriented structure maps naturally onto the way campus data is organized in this project: a building is a document that contains its floors, and each floor contains its rooms and offices. This nesting reflects the real physical hierarchy of the campus and makes the data straightforward to retrieve and display in the same shape it will be shown to the user.

### Development and Testing Tools

**Visual Studio Code** was used as the main code editor for developing both the mobile application and the backend. **Postman** was used to test each backend API endpoint independently, confirming that it returned the correct data before it was connected to the mobile application; this staged testing is consistent with the prototyping and user-evaluation approach described in Section 3.6, since faults can be identified at the level of an individual endpoint rather than only after the full application is assembled. **Git and GitHub** were used for version control, both to safeguard the work against loss and to provide a record of the progressive development of the application over the course of the project.

## 3.6.3 Fallback Option

Given the time and resource constraints of a final-year project, a fallback option was identified in case the development of a custom Node.js, Express, and MongoDB backend could not be completed within the available time. In that event, **Firebase (Firestore)** would be used in place of the backend and database tiers, since it can be accessed directly from the React Native application and provides data storage and retrieval without the need to build and host a separate server. The trade-off, and the reason it is treated only as a fallback rather than the primary approach, is that it would reduce the amount of custom backend work available to demonstrate and discuss, which is itself a component that the project is expected to present.
