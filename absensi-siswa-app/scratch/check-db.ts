import "dotenv/config";
import { db } from "../src/db/index";
import { teachers, subjects, classes } from "../src/db/schema";


async function checkAssignments() {
  const allTeachers = await db.select().from(teachers).all();
  console.log("Teachers:", allTeachers.map(t => ({ id: t.id, name: t.namaLengkap })));

  const allSubjects = await db.select().from(subjects).all();
  console.log("Subjects (includes Teacher ID and Classes):", allSubjects.map(s => ({
    id: s.id,
    name: s.namaMapel,
    teacherId: s.teacherId,
    classes: s.kelasDiampu
  })));
  
  const allClasses = await db.select().from(classes).all();
  console.log("Classes:", allClasses.map(c => ({ name: c.namaKelas, wali: c.waliKelas })));
}

checkAssignments().catch(console.error);
