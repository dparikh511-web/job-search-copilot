import { StructuredResume } from "../services/resumeRenderer";

export const sampleResume: StructuredResume = {
  name: "Daksh Parikh",
  contact: "New Haven, CT 06516 | (984) 260-1935 | d.parikh511@gmail.com | linkedin.com/in/dakshparikh",
  summary:
    "Software engineer with 6 years building production systems across mobile, backend, and legacy ERP integrations. Experience includes PHP/Laravel APIs, PostgreSQL-backed data pipelines, and Claude API-powered document workflows, alongside a widely used Ionic/Angular delivery application. Comfortable owning full-stack features from database design through user-facing interfaces in fast-moving, high-ownership environments.",
  skills: [
    { category: "Programming Languages", items: ["TypeScript", "JavaScript", "Java", "HTML", "SCSS", "PHP", "Node.js"] },
    { category: "Frameworks and Libraries", items: ["Ionic", "Angular", "Apache Cordova", "Laravel Lumen", "Blade", "RxJS", "NgRx Store"] },
    { category: "Databases", items: ["PostgreSQL", "PouchDB", "Advantage Database Server", "MySQL", "MongoDB"] },
    { category: "DevOps and Tools", items: ["Jenkins", "CI/CD", "Git", "Agile", "Google Play Console", "Apple App Store Connect"] },
    { category: "AI Tools", items: ["Claude API (integration and prompt engineering)"] },
  ],
  experience: [
    {
      title: "Mobile Application Developer",
      company: "NECS Inc",
      location: "Branford, CT",
      dates: "Oct 2020 - Present",
      sections: [
        {
          label: "Backend: Entree ERP Integration & POD-Server",
          bullets: [
            "Built and maintained bidirectional data integration between the Entree ERP system (Delphi), POD-Server (PHP/PostgreSQL), and mobile clients across the full order-to-payment lifecycle.",
            "Designed a device-bound concurrent licensing system enforcing seat limits across multi-tenant deployments and eliminating credential sharing among field teams.",
            "Built an internal admin portal using PHP, Laravel Lumen, and Blade for tenant, license, and access management with role-based permissions for internal teams.",
            "Integrated the Claude API into internal workflows to process delivery documentation and extract structured data from scan and photo records.",
            "Owned Jenkins CI/CD pipelines producing 50+ branded builds across sideload and app store variants, streamlining releases across environment configurations.",
            "Designed a serialized data tracking pipeline capturing per-case photo, location, timestamp and return code data for downstream reporting and reconciliation.",
            "Optimized backend scan-processing workflows, improving throughput by about 14% on high-volume delivery routes through query and validation tuning.",
            "Maintained PostgreSQL schemas and REST endpoints powering invoice validation, payment collection, and proof-of-delivery data across 1,000+ daily driver transactions.",
          ],
        },
        {
          label: "Frontend: Entree.POD / Entree.Express",
          bullets: [
            "Led development of a production Ionic/Angular delivery app used by 1,000+ drivers daily for invoice validation and proof-of-delivery capture.",
            "Designed an offline-first PouchDB/NgRx sync architecture that queued delivery operations locally and flushed them to the server after reconnection.",
            "Developed custom Cordova plugins in native Java bridging barcode scanner hardware and receipt printers to the JavaScript application layer.",
          ],
        },
      ],
    },
    {
      title: "iOS Developer Intern",
      company: "WizeView",
      location: "Raleigh, NC",
      dates: "Jun 2019 - Aug 2019",
      sections: [
        {
          label: null,
          bullets: [
            "Developed an iOS app in Swift to upload photos and videos to AWS S3, generating secure pre-signed URLs for ML testing.",
            "Implemented HTTP request workflows for media transmission and validation, later adopted internally for product demos and client onboarding.",
          ],
        },
      ],
    },
  ],
  education: [
    { school: "University of New Haven, West Haven, CT", degree: "Master of Science in Computer Science", date: "May 2020", gpa: "3.5/4.0" },
    { school: "Atmiya University, Rajkot, India", degree: "Bachelor of Technology in Information Technology", date: "Jun 2017", gpa: "3.7/4.0" },
  ],
};
