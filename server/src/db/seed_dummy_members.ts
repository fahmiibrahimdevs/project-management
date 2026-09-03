import { db } from "./database";

export async function seedTestingDummyMembers() {
  const defaultPasswordHash = await Bun.password.hash("1", {
    algorithm: "bcrypt",
    cost: 4,
  });

  const dummyMembers = [
    // --- PMs (3) ---
    {
      id: "usr-dummy-pm-1",
      name: "Budi Santoso",
      email: "budi.santoso@fsi.com",
      role: "pm",
      job_title: "Technical Project Manager",
      department: "Project Management Office",
      avatar_color: "#7c3aed",
      phone: "081234567801",
      gender: "Laki-laki",
      join_date: "2024-01-15",
    },
    {
      id: "usr-dummy-pm-2",
      name: "Siti Rahmawati",
      email: "siti.rahmawati@fsi.com",
      role: "pm",
      job_title: "Scrum Master & PM",
      department: "Project Management Office",
      avatar_color: "#9333ea",
      phone: "081234567802",
      gender: "Perempuan",
      join_date: "2024-02-01",
    },
    {
      id: "usr-dummy-pm-3",
      name: "Rian Pratama",
      email: "rian.pratama@fsi.com",
      role: "pm",
      job_title: "Hardware PM",
      department: "Hardware Engineering",
      avatar_color: "#6b21a8",
      phone: "081234567803",
      gender: "Laki-laki",
      join_date: "2024-03-10",
    },

    // --- Karyawan / Engineers (20) ---
    {
      id: "usr-dummy-karyawan-1",
      name: "Hendro Gunawan",
      email: "hendro.gunawan@fsi.com",
      role: "karyawan",
      job_title: "Senior Embedded Engineer",
      department: "Firmware & IoT",
      avatar_color: "#059669",
      phone: "081234567804",
      gender: "Laki-laki",
      join_date: "2023-05-10",
    },
    {
      id: "usr-dummy-karyawan-2",
      name: "Maya Indah",
      email: "maya.indah@fsi.com",
      role: "karyawan",
      job_title: "UI/UX Product Designer",
      department: "Design & Product",
      avatar_color: "#ec4899",
      phone: "081234567805",
      gender: "Perempuan",
      join_date: "2023-06-01",
    },
    {
      id: "usr-dummy-karyawan-3",
      name: "Rizky Ramadhan",
      email: "rizky.ramadhan@fsi.com",
      role: "karyawan",
      job_title: "Fullstack Web Developer",
      department: "Software Engineering",
      avatar_color: "#0284c7",
      phone: "081234567806",
      gender: "Laki-laki",
      join_date: "2023-07-15",
    },
    {
      id: "usr-dummy-karyawan-4",
      name: "Dewi Lestari",
      email: "dewi.lestari@fsi.com",
      role: "karyawan",
      job_title: "QA Automation Engineer",
      department: "Quality Assurance",
      avatar_color: "#14b8a6",
      phone: "081234567807",
      gender: "Perempuan",
      join_date: "2023-08-20",
    },
    {
      id: "usr-dummy-karyawan-5",
      name: "Agus Setiawan",
      email: "agus.setiawan@fsi.com",
      role: "karyawan",
      job_title: "PCB & Hardware Layout Specialist",
      department: "Hardware Engineering",
      avatar_color: "#d97706",
      phone: "081234567808",
      gender: "Laki-laki",
      join_date: "2023-09-01",
    },
    {
      id: "usr-dummy-karyawan-6",
      name: "Bayu Nugroho",
      email: "bayu.nugroho@fsi.com",
      role: "karyawan",
      job_title: "DevOps & Cloud Architect",
      department: "Infrastructure",
      avatar_color: "#2563eb",
      phone: "081234567809",
      gender: "Laki-laki",
      join_date: "2023-10-12",
    },
    {
      id: "usr-dummy-karyawan-7",
      name: "Eko Prasetyo",
      email: "eko.prasetyo@fsi.com",
      role: "karyawan",
      job_title: "Robotics & SLAM Specialist",
      department: "R&D Automation",
      avatar_color: "#4f46e5",
      phone: "081234567810",
      gender: "Laki-laki",
      join_date: "2023-11-05",
    },
    {
      id: "usr-dummy-karyawan-8",
      name: "Tri Wahyuni",
      email: "tri.wahyuni@fsi.com",
      role: "karyawan",
      job_title: "Data Analyst & BOM Auditor",
      department: "Operations & Procurement",
      avatar_color: "#8b5cf6",
      phone: "081234567811",
      gender: "Perempuan",
      join_date: "2023-12-01",
    },
    {
      id: "usr-dummy-karyawan-9",
      name: "Dian Sastro",
      email: "dian.sastro@fsi.com",
      role: "karyawan",
      job_title: "Frontend React Developer",
      department: "Software Engineering",
      avatar_color: "#f43f5e",
      phone: "081234567812",
      gender: "Perempuan",
      join_date: "2024-01-10",
    },
    {
      id: "usr-dummy-karyawan-10",
      name: "Gita Permata",
      email: "gita.permata@fsi.com",
      role: "karyawan",
      job_title: "Firmware Test Engineer",
      department: "Quality Assurance",
      avatar_color: "#06b6d4",
      phone: "081234567813",
      gender: "Perempuan",
      join_date: "2024-02-15",
    },
    {
      id: "usr-dummy-karyawan-11",
      name: "Hendra Wijaya",
      email: "hendra.wijaya@fsi.com",
      role: "karyawan",
      job_title: "Industrial Automation Engineer",
      department: "Hardware Engineering",
      avatar_color: "#059669",
      phone: "081234567814",
      gender: "Laki-laki",
      join_date: "2024-03-01",
    },
    {
      id: "usr-dummy-karyawan-12",
      name: "Indra Kusuma",
      email: "indra.kusuma@fsi.com",
      role: "karyawan",
      job_title: "Backend Go / Node Specialist",
      department: "Software Engineering",
      avatar_color: "#3b82f6",
      phone: "081234567815",
      gender: "Laki-laki",
      join_date: "2024-03-15",
    },
    {
      id: "usr-dummy-karyawan-13",
      name: "Joko Susilo",
      email: "joko.susilo@fsi.com",
      role: "karyawan",
      job_title: "Electrical Assembly Lead",
      department: "Manufacturing",
      avatar_color: "#eab308",
      phone: "081234567816",
      gender: "Laki-laki",
      join_date: "2024-04-01",
    },
    {
      id: "usr-dummy-karyawan-14",
      name: "Kartika Sari",
      email: "kartika.sari@fsi.com",
      role: "karyawan",
      job_title: "Technical Writer & SOP Officer",
      department: "Documentation",
      avatar_color: "#a855f7",
      phone: "081234567817",
      gender: "Perempuan",
      join_date: "2024-04-10",
    },
    {
      id: "usr-dummy-karyawan-15",
      name: "Lukman Hakim",
      email: "lukman.hakim@fsi.com",
      role: "karyawan",
      job_title: "Security & Network Engineer",
      department: "Infrastructure",
      avatar_color: "#64748b",
      phone: "081234567818",
      gender: "Laki-laki",
      join_date: "2024-05-01",
    },
    {
      id: "usr-dummy-karyawan-16",
      name: "Mega Utami",
      email: "mega.utami@fsi.com",
      role: "karyawan",
      job_title: "Quality Control Analyst",
      department: "Quality Assurance",
      avatar_color: "#ec4899",
      phone: "081234567819",
      gender: "Perempuan",
      join_date: "2024-05-15",
    },
    {
      id: "usr-dummy-karyawan-17",
      name: "Nanda Putra",
      email: "nanda.putra@fsi.com",
      role: "karyawan",
      job_title: "Microcontroller C/C++ Developer",
      department: "Firmware & IoT",
      avatar_color: "#10b981",
      phone: "081234567820",
      gender: "Laki-laki",
      join_date: "2024-06-01",
    },
    {
      id: "usr-dummy-karyawan-18",
      name: "Oki Setiawan",
      email: "oki.setiawan@fsi.com",
      role: "karyawan",
      job_title: "IoT Sensor Calibration Engineer",
      department: "Hardware Engineering",
      avatar_color: "#f59e0b",
      phone: "081234567821",
      gender: "Laki-laki",
      join_date: "2024-06-15",
    },
    {
      id: "usr-dummy-karyawan-19",
      name: "Pandu Wicaksono",
      email: "pandu.wicaksono@fsi.com",
      role: "karyawan",
      job_title: "System Integration Specialist",
      department: "R&D Automation",
      avatar_color: "#8b5cf6",
      phone: "081234567822",
      gender: "Laki-laki",
      join_date: "2024-07-01",
    },
    {
      id: "usr-dummy-karyawan-20",
      name: "Rini Wulandari",
      email: "rini.wulandari@fsi.com",
      role: "karyawan",
      job_title: "Product Compliance & Safety Officer",
      department: "Operations",
      avatar_color: "#06b6d4",
      phone: "081234567823",
      gender: "Perempuan",
      join_date: "2024-07-15",
    },

    // --- Magang / Interns (7) ---
    {
      id: "usr-dummy-magang-1",
      name: "Ahmad Zaki",
      email: "ahmad.zaki@fsi.com",
      role: "magang",
      job_title: "IoT Intern",
      department: "Firmware & IoT",
      avatar_color: "#d97706",
      phone: "081234567824",
      gender: "Laki-laki",
      join_date: "2024-08-01",
    },
    {
      id: "usr-dummy-magang-2",
      name: "Bella Safira",
      email: "bella.safira@fsi.com",
      role: "magang",
      job_title: "UI/UX Intern",
      department: "Design & Product",
      avatar_color: "#f43f5e",
      phone: "081234567825",
      gender: "Perempuan",
      join_date: "2024-08-01",
    },
    {
      id: "usr-dummy-magang-3",
      name: "Dimas Anggara",
      email: "dimas.anggara@fsi.com",
      role: "magang",
      job_title: "Frontend Engineering Intern",
      department: "Software Engineering",
      avatar_color: "#3b82f6",
      phone: "081234567826",
      gender: "Laki-laki",
      join_date: "2024-08-01",
    },
    {
      id: "usr-dummy-magang-4",
      name: "Fajar Hidayat",
      email: "fajar.hidayat@fsi.com",
      role: "magang",
      job_title: "Embedded Systems Intern",
      department: "Hardware Engineering",
      avatar_color: "#10b981",
      phone: "081234567827",
      gender: "Laki-laki",
      join_date: "2024-08-01",
    },
    {
      id: "usr-dummy-magang-5",
      name: "Hani Maulida",
      email: "hani.maulida@fsi.com",
      role: "magang",
      job_title: "Quality Assurance Intern",
      department: "Quality Assurance",
      avatar_color: "#ec4899",
      phone: "081234567828",
      gender: "Perempuan",
      join_date: "2024-08-01",
    },
    {
      id: "usr-dummy-magang-6",
      name: "Kevin Sanjaya",
      email: "kevin.sanjaya@fsi.com",
      role: "magang",
      job_title: "Robotics Hardware Intern",
      department: "R&D Automation",
      avatar_color: "#6366f1",
      phone: "081234567829",
      gender: "Laki-laki",
      join_date: "2024-08-01",
    },
    {
      id: "usr-dummy-magang-7",
      name: "Nabila Syakieb",
      email: "nabila.syakieb@fsi.com",
      role: "magang",
      job_title: "Project Management Intern",
      department: "Project Management Office",
      avatar_color: "#8b5cf6",
      phone: "081234567830",
      gender: "Perempuan",
      join_date: "2024-08-01",
    },
  ];

  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO members (
      id, name, email, password_hash, role, job_title, department, avatar_color, phone, gender, join_date
    ) VALUES (
      $id, $name, $email, $password_hash, $role, $job_title, $department, $avatar_color, $phone, $gender, $join_date
    )
  `);

  const insertProjectMember = db.prepare(`
    INSERT OR IGNORE INTO project_members (project_id, member_id, project_role)
    VALUES ($project_id, $member_id, $project_role)
  `);

  // Get all projects
  const projects = db.query("SELECT id FROM projects").all() as { id: string }[];

  for (const u of dummyMembers) {
    insertUser.run({
      $id: u.id,
      $name: u.name,
      $email: u.email,
      $password_hash: defaultPasswordHash,
      $role: u.role,
      $job_title: u.job_title,
      $department: u.department,
      $avatar_color: u.avatar_color,
      $phone: u.phone,
      $gender: u.gender,
      $join_date: u.join_date,
    });

    // Add to all existing projects
    for (const p of projects) {
      insertProjectMember.run({
        $project_id: p.id,
        $member_id: u.id,
        $project_role: u.job_title,
      });
    }
  }

  console.log(`✅ Seeded ${dummyMembers.length} dummy testing members into database & projects!`);
}

export async function removeTestingDummyMembers() {
  // Delete all members with id starting with usr-dummy-
  db.run("DELETE FROM members WHERE id LIKE 'usr-dummy-%';");
  console.log("✅ Successfully removed all testing dummy members. Restored original real accounts.");
}

// If executed directly
if (import.meta.main) {
  const arg = process.argv[2];
  if (arg === "clean" || arg === "restore") {
    await removeTestingDummyMembers();
  } else {
    await seedTestingDummyMembers();
  }
}
