// Habilidades sugeridas para los selectores del CV builder. Cada fila del CV sale como
// «Python (Intermedio): FastAPI, pandas.» o, si es blanda, «Trabajo en Equipo.».

export const NIVELES = ["Básico", "Intermedio", "Avanzado", "Experto"] as const;

export const HABILIDADES_TECNICAS: Record<string, string[]> = {
  "Lenguajes de programación": [
    "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#", "Go", "Rust", "PHP", "Ruby", "Kotlin",
    "Swift", "Dart", "R", "MATLAB", "Scala", "Bash",
  ],
  "Datos e inteligencia artificial": [
    "SQL", "Machine Learning", "Deep Learning", "IA Gen", "RAG", "Visión por Computadora",
    "Procesamiento de Lenguaje Natural", "Ciencia de Datos", "Análisis de Datos", "Estadística", "Big Data",
    "Power BI", "Tableau", "Looker Studio", "Excel", "Pandas", "TensorFlow", "PyTorch", "Scikit-learn", "Spark",
  ],
  "Desarrollo web y móvil": [
    "HTML y CSS", "React", "Next.js", "Angular", "Vue", "Node.js", "Express", "Django", "FastAPI", "Flask",
    "Spring Boot", ".NET", "Laravel", "APIs REST", "GraphQL", "React Native", "Flutter", "Android", "iOS",
  ],
  "Bases de datos": ["PostgreSQL", "MySQL", "SQL Server", "Oracle", "MongoDB", "Redis", "Firebase", "Supabase"],
  "Cloud y DevOps": [
    "Cloud", "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform", "CI/CD", "GitHub Actions",
    "Linux", "Nginx", "Git & GitHub",
  ],
  "Diseño y producto": ["Figma", "UX/UI", "Adobe Photoshop", "Adobe Illustrator", "Canva", "Scrum", "Kanban", "Jira", "Notion"],
  "Gestión y oficina": [
    "Microsoft Office", "Word", "PowerPoint", "Google Workspace", "SAP", "ERP", "CRM", "Contabilidad",
    "Finanzas", "Marketing Digital", "SEO", "Gestión de Proyectos",
  ],
  Idiomas: ["Inglés", "Español", "Portugués", "Francés", "Alemán", "Italiano", "Chino Mandarín", "Japonés", "Quechua"],
};

export const HABILIDADES_BLANDAS: string[] = [
  "Pensamiento Crítico y Analítico", "Aprendizaje Acelerado", "Mejora Continua", "Trabajo en Equipo",
  "Comunicación Efectiva", "Liderazgo", "Resolución de Problemas", "Autonomía", "Adaptabilidad",
  "Gestión del Tiempo", "Creatividad", "Proactividad", "Orientación a Resultados", "Negociación",
  "Empatía", "Toma de Decisiones", "Trabajo bajo Presión", "Atención al Detalle", "Organización",
  "Inteligencia Emocional", "Pensamiento Estratégico", "Orientación al Cliente", "Responsabilidad",
];

export type Habilidad = { id: string; nombre: string; nivel: string; detalle: string };

// «Python (Intermedio): FastAPI, pandas.»; el punto final se agrega si falta.
export function textoHabilidad(h: Habilidad): string {
  let t = h.nombre.trim();
  if (!t) return "";
  if (h.nivel) t += ` (${h.nivel})`;
  if (h.detalle.trim()) t += `: ${h.detalle.trim()}`;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

// Lo inverso, para importar un Word: «Python (Intermedio): FastAPI, pip.»
export function leerHabilidad(s: string, id: string): Habilidad {
  const sinPunto = s.trim().replace(/\.$/, "");
  const m = /^([^():]+?)\s*(?:\(([^)]*)\))?\s*(?::\s*([\s\S]*))?$/.exec(sinPunto);
  if (!m) return { id, nombre: sinPunto, nivel: "", detalle: "" };
  const nivel = (NIVELES as readonly string[]).find((n) => n.toLowerCase() === (m[2] ?? "").trim().toLowerCase()) ?? "";
  // Un paréntesis que no es nivel se queda en el nombre.
  const nombre = nivel || !m[2] ? m[1].trim() : `${m[1].trim()} (${m[2]})`;
  return { id, nombre, nivel, detalle: (m[3] ?? "").trim() };
}

export const esBlanda = (titulo: string) => /soft|blanda|personal|interpersonal/i.test(titulo);
