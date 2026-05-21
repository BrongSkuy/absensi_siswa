import { db } from "../src/db/index";
import { teachers, teacherClasses, teacherSubjects, classes } from "../src/db/schema";


async function checkAssignments() {
  const allTeachers = await db.select().from(teachers).all();
  console.log("Teachers:", allTeachers.map(t => ({ id: t.id, name: t.namaLengkap })));

  const allTeacherClasses = await db.select().from(teacherClasses).all();
  console.log("Teacher Classes Assignments:", allTeacherClasses);

  const allTeacherSubjects = await db.select().from(teacherSubjects).all();
  console.log("Teacher Subjects Assignments:", allTeacherSubjects);
  
  const allClasses = await db.select().from(classes).all();
  console.log("Classes:", allClasses.map(c => ({ name: c.namaKelas, wali: c.waliKelas })));
}

checkAssignments().catch(console.error);
