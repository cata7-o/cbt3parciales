// Estado global de la aplicación
let currentUser = null;
let students = [];
let nextStudentId = 1;
let nextSubjectId = 1;
let pendingAction = null;
let sessionTimeout = null;

// Datos de demostración
const demoData = {
    users: {
        'profesor1': {
            username: 'profesor1',
            password: hashPassword('123456'),
            name: 'Prof. María González',
            subject: 'Matemáticas'
        }
    },
    userData: {
        'profesor1': {
            students: [
                {
                    id: 1,
                    name: "Ana López",
                    subjects: [
                        {
                            id: 1,
                            name: "Matemáticas",
                            parcial1: 8.0,
                            parcial2: 7.0,
                            parcial3: 9.0,
                            average: 8.0,
                            sum: 24.0,
                            status: "APROBADA"
                        }
                    ],
                    status: "REGULAR"
                },
                {
                    id: 2,
                    name: "Carlos Rivera",
                    subjects: [
                        {
                            id: 2,
                            name: "Matemáticas",
                            parcial1: 5.0,
                            parcial2: 4.0,
                            parcial3: 6.0,
                            average: 5.0,
                            sum: 15.0,
                            status: "REPROBADA"
                        },
                        {
                            id: 3,
                            name: "Español",
                            parcial1: 4.0,
                            parcial2: 3.0,
                            parcial3: 5.0,
                            average: 4.0,
                            sum: 12.0,
                            status: "REPROBADA"
                        }
                    ],
                    status: "EXTRAORDINARIO"
                }
            ],
            nextStudentId: 3,
            nextSubjectId: 4
        }
    }
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando Sistema de Calificaciones para Docentes...');
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    initializeData();
    updateDateTime();
    setInterval(updateDateTime, 60000); // Actualizar cada minuto
    
    // Verificar si hay sesión activa
    const activeSession = getFromStorage('activeSession');
    if (activeSession && activeSession.username) {
        const users = getFromStorage('users') || {};
        if (users[activeSession.username]) {
            currentUser = users[activeSession.username];
            loadUserData();
            showView('appView');
            updateUserInterface();
            startSessionTimeout();
            return;
        }
    }
    
    // Mostrar vista de bienvenida
    showView('welcomeView');
}

function setupEventListeners() {
    // Navegación entre vistas
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const goToLogin = document.getElementById('goToLogin');
    const goToRegister = document.getElementById('goToRegister');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) loginBtn.addEventListener('click', () => showView('loginView'));
    if (registerBtn) registerBtn.addEventListener('click', () => showView('registerView'));
    if (goToLogin) goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showView('loginView');
    });
    if (goToRegister) goToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showView('registerView');
    });
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Formularios de autenticación
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // Eventos de la aplicación principal
    setupAppEventListeners();
}

function setupAppEventListeners() {
    // Agregar alumno
    const addStudentBtn = document.getElementById('addStudentBtn');
    const studentNameInput = document.getElementById('studentName');
    
    if (addStudentBtn) addStudentBtn.addEventListener('click', handleAddStudent);
    if (studentNameInput) {
        studentNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddStudent();
            }
        });
    }

    // Agregar materia
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    if (addSubjectBtn) addSubjectBtn.addEventListener('click', handleAddSubject);

    // Selectores de calificaciones
    const gradeStudentSelect = document.getElementById('gradeStudentSelect');
    const gradeSubjectSelect = document.getElementById('gradeSubjectSelect');
    
    if (gradeStudentSelect) gradeStudentSelect.addEventListener('change', handleGradeStudentChange);
    if (gradeSubjectSelect) gradeSubjectSelect.addEventListener('change', handleGradeSubjectChange);

    // Inputs de calificaciones
    const gradeInputs = ['parcial1', 'parcial2', 'parcial3'];
    gradeInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', calculateGrades);
            input.addEventListener('blur', validateGrade);
        }
    });

    // Botones de acción de calificaciones
    const saveGradesBtn = document.getElementById('saveGradesBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');
    
    if (saveGradesBtn) saveGradesBtn.addEventListener('click', handleSaveGrades);
    if (clearFormBtn) clearFormBtn.addEventListener('click', clearGradeForm);

    // Botones de control de lista
    const expandAllBtn = document.getElementById('expandAllBtn');
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (expandAllBtn) expandAllBtn.addEventListener('click', () => toggleAllStudents(true));
    if (collapseAllBtn) collapseAllBtn.addEventListener('click', () => toggleAllStudents(false));
    if (clearAllBtn) clearAllBtn.addEventListener('click', handleClearAll);

    // Generar PDF
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    if (generatePdfBtn) generatePdfBtn.addEventListener('click', generatePDF);

    // Modal de confirmación
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    const confirmModal = document.getElementById('confirmModal');
    
    if (confirmYes) confirmYes.addEventListener('click', handleConfirmYes);
    if (confirmNo) confirmNo.addEventListener('click', handleConfirmNo);
    if (confirmModal) {
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) hideModal();
        });
    }

    // Modal de notificación
    const notificationOk = document.getElementById('notificationOk');
    const notificationModal = document.getElementById('notificationModal');
    
    if (notificationOk) notificationOk.addEventListener('click', () => hideNotificationModal());
    if (notificationModal) {
        notificationModal.addEventListener('click', function(e) {
            if (e.target === notificationModal) hideNotificationModal();
        });
    }
}

// Funciones de autenticación
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const username = document.getElementById('registerUsername').value.trim();
    const subject = document.getElementById('registerSubject').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Limpiar errores previos
    clearFormErrors('registerForm');
    
    // Validaciones
    if (!name) {
        showFieldError('registerName', 'El nombre es requerido');
        return;
    }
    
    if (username.length < 3) {
        showFieldError('registerUsername', 'El usuario debe tener al menos 3 caracteres');
        return;
    }
    
    if (password.length < 6) {
        showFieldError('registerPassword', 'La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    if (password !== confirmPassword) {
        showFieldError('registerConfirmPassword', 'Las contraseñas no coinciden');
        return;
    }
    
    // Verificar si el usuario ya existe
    const users = getFromStorage('users') || {};
    if (users[username]) {
        showFieldError('registerUsername', 'Este nombre de usuario ya existe');
        return;
    }
    
    // Crear nuevo usuario
    const newUser = {
        username: username,
        password: hashPassword(password),
        name: name,
        subject: subject || ''
    };
    
    users[username] = newUser;
    saveToStorage('users', users);
    
    // Inicializar datos de usuario vacíos
    const userData = getFromStorage('userData') || {};
    userData[username] = {
        students: [],
        nextStudentId: 1,
        nextSubjectId: 1
    };
    saveToStorage('userData', userData);
    
    showNotification('Registro exitoso', 'Tu cuenta ha sido creada correctamente. Ahora puedes iniciar sesión.');
    
    // Limpiar formulario y ir a login
    document.getElementById('registerForm').reset();
    showView('loginView');
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Limpiar errores previos
    clearFormErrors('loginForm');
    
    if (!username || !password) {
        showFieldError('loginPassword', 'Usuario y contraseña son requeridos');
        return;
    }
    
    const users = getFromStorage('users') || {};
    const user = users[username];
    
    if (!user || user.password !== hashPassword(password)) {
        showFieldError('loginPassword', 'Usuario o contraseña incorrectos');
        return;
    }
    
    // Login exitoso
    currentUser = user;
    saveToStorage('activeSession', { username: username });
    
    loadUserData();
    showView('appView');
    updateUserInterface();
    startSessionTimeout();
    
    document.getElementById('loginForm').reset();
}

function logout() {
    clearSessionTimeout();
    currentUser = null;
    students = [];
    removeFromStorage('activeSession');
    showView('welcomeView');
    clearAllForms();
}

// Funciones de gestión de datos
function loadUserData() {
    if (!currentUser) return;
    
    const userData = getFromStorage('userData') || {};
    const userDataObj = userData[currentUser.username];
    
    if (userDataObj) {
        students = userDataObj.students || [];
        nextStudentId = userDataObj.nextStudentId || 1;
        nextSubjectId = userDataObj.nextSubjectId || 1;
    } else {
        students = [];
        nextStudentId = 1;
        nextSubjectId = 1;
    }
    
    console.log('Datos de usuario cargados:', students.length, 'estudiantes');
    refreshAllComponents();
}

function saveUserData() {
    if (!currentUser) return;
    
    const userData = getFromStorage('userData') || {};
    userData[currentUser.username] = {
        students: students,
        nextStudentId: nextStudentId,
        nextSubjectId: nextSubjectId
    };
    saveToStorage('userData', userData);
    console.log('Datos guardados para usuario:', currentUser.username);
}

function initializeData() {
    const users = getFromStorage('users') || {};
    const userData = getFromStorage('userData') || {};
    
    // Si no hay datos, cargar datos de demostración
    if (Object.keys(users).length === 0) {
        saveToStorage('users', demoData.users);
        saveToStorage('userData', demoData.userData);
        console.log('Datos de demostración inicializados');
    }
}

// Funciones de la aplicación principal
function handleAddStudent() {
    const studentNameInput = document.getElementById('studentName');
    const name = studentNameInput.value.trim();
    
    if (!name) {
        showError(studentNameInput, 'El nombre del alumno es requerido');
        return;
    }

    if (students.some(student => student.name.toLowerCase() === name.toLowerCase())) {
        showError(studentNameInput, 'Ya existe un alumno con este nombre');
        return;
    }

    const newStudent = {
        id: nextStudentId++,
        name: name,
        subjects: [],
        status: 'REGULAR'
    };

    students.push(newStudent);
    console.log('Alumno agregado:', newStudent);
    console.log('Total estudiantes:', students.length);
    
    saveUserData();
    
    studentNameInput.value = '';
    clearError(studentNameInput);
    
    // Forzar actualización completa de la interfaz
    setTimeout(() => {
        refreshAllComponents();
        showNotification('Éxito', `Alumno "${name}" agregado correctamente`);
    }, 100);
}

function handleAddSubject() {
    const studentSelect = document.getElementById('studentSelect');
    const subjectNameInput = document.getElementById('subjectName');
    
    const studentId = parseInt(studentSelect.value);
    const subjectName = subjectNameInput.value.trim();
    
    if (!studentId) {
        showError(studentSelect, 'Selecciona un alumno');
        return;
    }
    
    if (!subjectName) {
        showError(subjectNameInput, 'El nombre de la materia es requerido');
        return;
    }

    const student = students.find(s => s.id === studentId);
    if (!student) {
        showError(studentSelect, 'Alumno no encontrado');
        return;
    }

    if (student.subjects.some(subject => subject.name.toLowerCase() === subjectName.toLowerCase())) {
        showError(subjectNameInput, 'Ya existe esta materia para el alumno seleccionado');
        return;
    }

    const newSubject = {
        id: nextSubjectId++,
        name: subjectName,
        parcial1: null,
        parcial2: null,
        parcial3: null,
        average: null,
        sum: null,
        status: null
    };

    student.subjects.push(newSubject);
    console.log('Materia agregada:', newSubject, 'al alumno:', student.name);
    
    saveUserData();
    
    subjectNameInput.value = '';
    studentSelect.value = '';
    clearError(studentSelect);
    clearError(subjectNameInput);
    
    refreshAllComponents();
    showNotification('Éxito', `Materia "${subjectName}" agregada al alumno "${student.name}"`);
}

function handleGradeStudentChange() {
    const gradeStudentSelect = document.getElementById('gradeStudentSelect');
    const gradeSubjectSelect = document.getElementById('gradeSubjectSelect');
    const gradeForm = document.getElementById('gradeForm');
    
    const studentId = parseInt(gradeStudentSelect.value);
    
    clearGradeInputs();
    
    if (!studentId) {
        gradeSubjectSelect.innerHTML = '<option value="">-- Primero selecciona un alumno --</option>';
        gradeSubjectSelect.disabled = true;
        gradeForm.classList.add('hidden');
        return;
    }

    const student = students.find(s => s.id === studentId);
    if (!student || student.subjects.length === 0) {
        gradeSubjectSelect.innerHTML = '<option value="">-- Este alumno no tiene materias --</option>';
        gradeSubjectSelect.disabled = true;
        gradeForm.classList.add('hidden');
        return;
    }

    gradeSubjectSelect.innerHTML = '<option value="">-- Selecciona una materia --</option>';
    student.subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = subject.name;
        gradeSubjectSelect.appendChild(option);
    });
    
    gradeSubjectSelect.disabled = false;
    gradeForm.classList.add('hidden');
}

function handleGradeSubjectChange() {
    const gradeStudentSelect = document.getElementById('gradeStudentSelect');
    const gradeSubjectSelect = document.getElementById('gradeSubjectSelect');
    const gradeForm = document.getElementById('gradeForm');
    
    const studentId = parseInt(gradeStudentSelect.value);
    const subjectId = parseInt(gradeSubjectSelect.value);
    
    if (!studentId || !subjectId) {
        gradeForm.classList.add('hidden');
        clearGradeInputs();
        return;
    }

    const student = students.find(s => s.id === studentId);
    const subject = student.subjects.find(sub => sub.id === subjectId);
    
    if (!subject) {
        gradeForm.classList.add('hidden');
        clearGradeInputs();
        return;
    }

    const parcial1Input = document.getElementById('parcial1');
    const parcial2Input = document.getElementById('parcial2');
    const parcial3Input = document.getElementById('parcial3');
    const promedioInput = document.getElementById('promedio');
    const sumaInput = document.getElementById('suma');
    
    parcial1Input.value = subject.parcial1 !== null ? subject.parcial1 : '';
    parcial2Input.value = subject.parcial2 !== null ? subject.parcial2 : '';
    parcial3Input.value = subject.parcial3 !== null ? subject.parcial3 : '';
    promedioInput.value = subject.average !== null ? subject.average.toFixed(2) : '';
    sumaInput.value = subject.sum !== null ? subject.sum.toFixed(1) : '';
    
    gradeForm.classList.remove('hidden');
    gradeForm.classList.add('fade-in');
    parcial1Input.focus();
}

function calculateGrades() {
    const parcial1Input = document.getElementById('parcial1');
    const parcial2Input = document.getElementById('parcial2');
    const parcial3Input = document.getElementById('parcial3');
    const promedioInput = document.getElementById('promedio');
    const sumaInput = document.getElementById('suma');
    
    const p1 = parseFloat(parcial1Input.value);
    const p2 = parseFloat(parcial2Input.value);
    const p3 = parseFloat(parcial3Input.value);
    
    const validGrades = [p1, p2, p3].filter(grade => !isNaN(grade));
    
    if (validGrades.length > 0) {
        const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
        const average = sum / validGrades.length;
        
        if (validGrades.length === 3) {
            promedioInput.value = average.toFixed(2);
            sumaInput.value = sum.toFixed(1);
        } else {
            promedioInput.value = `${average.toFixed(2)} (parcial)`;
            sumaInput.value = `${sum.toFixed(1)} (parcial)`;
        }
    } else {
        promedioInput.value = '';
        sumaInput.value = '';
    }
}

function validateGrade(event) {
    const input = event.target;
    const value = parseFloat(input.value);
    
    if (input.value && (isNaN(value) || value < 0 || value > 10)) {
        showError(input, 'La calificación debe ser entre 0 y 10');
        return false;
    }
    
    clearError(input);
    return true;
}

function handleSaveGrades() {
    const gradeStudentSelect = document.getElementById('gradeStudentSelect');
    const gradeSubjectSelect = document.getElementById('gradeSubjectSelect');
    const parcial1Input = document.getElementById('parcial1');
    const parcial2Input = document.getElementById('parcial2');
    const parcial3Input = document.getElementById('parcial3');
    
    const studentId = parseInt(gradeStudentSelect.value);
    const subjectId = parseInt(gradeSubjectSelect.value);
    
    const p1 = parseFloat(parcial1Input.value);
    const p2 = parseFloat(parcial2Input.value);
    const p3 = parseFloat(parcial3Input.value);
    
    if (!studentId || !subjectId) {
        showNotification('Error', 'Selecciona un alumno y una materia');
        return;
    }
    
    if (isNaN(p1) || isNaN(p2) || isNaN(p3)) {
        showNotification('Error', 'Todas las calificaciones son requeridas');
        return;
    }
    
    if (!validateAllGrades()) {
        return;
    }
    
    const student = students.find(s => s.id === studentId);
    const subject = student.subjects.find(sub => sub.id === subjectId);
    
    subject.parcial1 = p1;
    subject.parcial2 = p2;
    subject.parcial3 = p3;
    subject.sum = p1 + p2 + p3;
    subject.average = subject.sum / 3;
    subject.status = determineSubjectStatus(subject);
    
    student.status = determineStudentStatus(student);
    
    saveUserData();
    clearGradeForm();
    refreshAllComponents();
    
    showNotification('Éxito', 'Calificaciones guardadas correctamente');
}

function validateAllGrades() {
    const inputs = ['parcial1', 'parcial2', 'parcial3'];
    let isValid = true;
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        const value = parseFloat(input.value);
        
        if (isNaN(value) || value < 0 || value > 10) {
            showError(input, 'Ingresa una calificación válida (0-10)');
            isValid = false;
        } else {
            clearError(input);
        }
    });
    
    return isValid;
}

function determineSubjectStatus(subject) {
    if (subject.average < 6 || subject.sum < 18) {
        return 'REPROBADA';
    }
    return 'APROBADA';
}

function determineStudentStatus(student) {
    const failedSubjects = student.subjects.filter(subject => subject.status === 'REPROBADA').length;
    
    if (failedSubjects >= 2) {
        return 'EXTRAORDINARIO';
    }
    return 'REGULAR';
}

// Función para generar PDF mejorada
function generatePDF() {
    // Verificar si la librería está disponible
    if (typeof window.jsPDF === 'undefined') {
        // Intentar cargar desde el objeto global alternativo
        if (typeof jsPDF !== 'undefined') {
            window.jsPDF = jsPDF;
        } else {
            showNotification('Error', 'La librería PDF no está disponible. El reporte se generará como texto plano.');
            generateTextReport();
            return;
        }
    }

    try {
        const doc = new window.jsPDF.jsPDF();

        // Configuración inicial
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPosition = 30;

        // Título del documento
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Reporte de Calificaciones', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 20;

        // Información del docente
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Docente: ${currentUser.name}`, margin, yPosition);
        yPosition += 10;
        
        if (currentUser.subject) {
            doc.text(`Materia: ${currentUser.subject}`, margin, yPosition);
            yPosition += 10;
        }
        
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, yPosition);
        yPosition += 20;

        // Estadísticas generales
        const regularCount = students.filter(s => s.status === 'REGULAR').length;
        const extraordinaryCount = students.filter(s => s.status === 'EXTRAORDINARIO').length;
        
        doc.setFont(undefined, 'bold');
        doc.text('Resumen General:', margin, yPosition);
        yPosition += 10;
        
        doc.setFont(undefined, 'normal');
        doc.text(`• Alumnos Regulares: ${regularCount}`, margin + 10, yPosition);
        yPosition += 8;
        doc.text(`• Alumnos en Extraordinario: ${extraordinaryCount}`, margin + 10, yPosition);
        yPosition += 20;

        // Lista de alumnos
        doc.setFont(undefined, 'bold');
        doc.text('Detalle por Alumno:', margin, yPosition);
        yPosition += 15;

        students.forEach((student, index) => {
            // Verificar si necesitamos una nueva página
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 30;
            }

            // Nombre del alumno y estado
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${student.name}`, margin, yPosition);
            
            const statusColor = student.status === 'EXTRAORDINARIO' ? [255, 0, 0] : [0, 128, 0];
            doc.setTextColor(...statusColor);
            doc.text(`[${student.status}]`, margin + 100, yPosition);
            doc.setTextColor(0, 0, 0);
            
            yPosition += 10;

            // Materias del alumno
            if (student.subjects.length === 0) {
                doc.setFont(undefined, 'italic');
                doc.text('  Sin materias registradas', margin + 10, yPosition);
                yPosition += 10;
            } else {
                student.subjects.forEach(subject => {
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 30;
                    }

                    doc.setFont(undefined, 'normal');
                    const hasGrades = subject.parcial1 !== null;
                    
                    if (hasGrades) {
                        const gradeText = `  ${subject.name}: P1=${subject.parcial1.toFixed(1)} P2=${subject.parcial2.toFixed(1)} P3=${subject.parcial3.toFixed(1)} | Promedio: ${subject.average.toFixed(2)} | Suma: ${subject.sum.toFixed(1)} | ${subject.status}`;
                        doc.text(gradeText, margin + 10, yPosition);
                    } else {
                        doc.text(`  ${subject.name}: Sin calificaciones`, margin + 10, yPosition);
                    }
                    
                    yPosition += 8;
                });
            }
            
            yPosition += 10;
        });

        // Alumnos en extraordinario (si los hay)
        const extraordinaryStudents = students.filter(s => s.status === 'EXTRAORDINARIO');
        if (extraordinaryStudents.length > 0) {
            if (yPosition > 200) {
                doc.addPage();
                yPosition = 30;
            }

            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 0, 0);
            doc.text('⚠ ALUMNOS EN EXTRAORDINARIO:', margin, yPosition);
            doc.setTextColor(0, 0, 0);
            yPosition += 15;

            extraordinaryStudents.forEach((student, index) => {
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 30;
                }

                const failedSubjects = student.subjects.filter(sub => sub.status === 'REPROBADA').length;
                const lowSumSubjects = student.subjects.filter(sub => sub.sum !== null && sub.sum < 18).length;
                
                let reason = `${failedSubjects} materias reprobadas`;
                if (lowSumSubjects > 0) {
                    reason += `, ${lowSumSubjects} con suma < 18`;
                }

                doc.setFont(undefined, 'normal');
                doc.text(`${index + 1}. ${student.name} - ${reason}`, margin + 10, yPosition);
                yPosition += 10;
            });
        }

        // Pie de página
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10);
            doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, margin, doc.internal.pageSize.getHeight() - 10);
        }

        // Guardar el PDF
        const fileName = `Reporte_${currentUser.username}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        
        showNotification('Éxito', 'Reporte PDF generado correctamente');
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        showNotification('Error', 'Hubo un problema al generar el PDF. Se generará un reporte de texto alternativo.');
        generateTextReport();
    }
}

// Función alternativa para generar reporte de texto si falla el PDF
function generateTextReport() {
    try {
        let report = `REPORTE DE CALIFICACIONES\n`;
        report += `=======================================\n\n`;
        report += `Docente: ${currentUser.name}\n`;
        if (currentUser.subject) {
            report += `Materia: ${currentUser.subject}\n`;
        }
        report += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;

        const regularCount = students.filter(s => s.status === 'REGULAR').length;
        const extraordinaryCount = students.filter(s => s.status === 'EXTRAORDINARIO').length;

        report += `RESUMEN GENERAL:\n`;
        report += `• Alumnos Regulares: ${regularCount}\n`;
        report += `• Alumnos en Extraordinario: ${extraordinaryCount}\n\n`;

        report += `DETALLE POR ALUMNO:\n`;
        report += `===================\n\n`;

        students.forEach((student, index) => {
            report += `${index + 1}. ${student.name} [${student.status}]\n`;
            
            if (student.subjects.length === 0) {
                report += `   Sin materias registradas\n`;
            } else {
                student.subjects.forEach(subject => {
                    const hasGrades = subject.parcial1 !== null;
                    if (hasGrades) {
                        report += `   ${subject.name}: P1=${subject.parcial1.toFixed(1)} P2=${subject.parcial2.toFixed(1)} P3=${subject.parcial3.toFixed(1)} | Promedio: ${subject.average.toFixed(2)} | Suma: ${subject.sum.toFixed(1)} | ${subject.status}\n`;
                    } else {
                        report += `   ${subject.name}: Sin calificaciones\n`;
                    }
                });
            }
            report += `\n`;
        });

        const extraordinaryStudents = students.filter(s => s.status === 'EXTRAORDINARIO');
        if (extraordinaryStudents.length > 0) {
            report += `⚠ ALUMNOS EN EXTRAORDINARIO:\n`;
            report += `============================\n\n`;

            extraordinaryStudents.forEach((student, index) => {
                const failedSubjects = student.subjects.filter(sub => sub.status === 'REPROBADA').length;
                const lowSumSubjects = student.subjects.filter(sub => sub.sum !== null && sub.sum < 18).length;
                
                let reason = `${failedSubjects} materias reprobadas`;
                if (lowSumSubjects > 0) {
                    reason += `, ${lowSumSubjects} con suma < 18`;
                }

                report += `${index + 1}. ${student.name} - ${reason}\n`;
            });
        }

        report += `\n\nGenerado el ${new Date().toLocaleString('es-ES')}`;

        // Crear un blob con el contenido del reporte
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // Crear un enlace de descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_${currentUser.username}_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Éxito', 'Reporte de texto generado correctamente');
    } catch (error) {
        console.error('Error generando reporte de texto:', error);
        showNotification('Error', 'No se pudo generar el reporte');
    }
}

// Funciones auxiliares
function showView(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
        view.classList.remove('active');
        view.classList.add('hidden');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
    }
}

function updateUserInterface() {
    if (!currentUser) return;
    
    const teacherWelcome = document.getElementById('teacherWelcome');
    if (teacherWelcome) {
        teacherWelcome.textContent = `Bienvenido, ${currentUser.name}`;
    }
}

function updateDateTime() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        dateTimeElement.textContent = now.toLocaleDateString('es-ES', options);
    }
}

function startSessionTimeout() {
    clearSessionTimeout();
    // Timeout de 2 horas (120 minutos)
    sessionTimeout = setTimeout(() => {
        showNotification('Sesión Expirada', 'Tu sesión ha expirado por inactividad. Debes iniciar sesión nuevamente.');
        setTimeout(logout, 3000);
    }, 120 * 60 * 1000);
}

function clearSessionTimeout() {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
    }
}

// Funciones de almacenamiento
function saveToStorage(key, data) {
    try {
        localStorage.setItem(`grading_system_${key}`, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

function getFromStorage(key) {
    try {
        const data = localStorage.getItem(`grading_system_${key}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return null;
    }
}

function removeFromStorage(key) {
    try {
        localStorage.removeItem(`grading_system_${key}`);
    } catch (error) {
        console.error('Error removing from storage:', error);
    }
}

// Función simple de hash para contraseñas (solo para demo)
function hashPassword(password) {
    let hash = 0;
    if (password.length === 0) return hash.toString();
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Funciones de interfaz mejoradas
function clearGradeForm() {
    clearGradeInputs();
    
    const gradeStudentSelect = document.getElementById('gradeStudentSelect');
    const gradeSubjectSelect = document.getElementById('gradeSubjectSelect');
    const gradeForm = document.getElementById('gradeForm');
    
    gradeStudentSelect.value = '';
    gradeSubjectSelect.value = '';
    gradeSubjectSelect.disabled = true;
    gradeSubjectSelect.innerHTML = '<option value="">-- Primero selecciona un alumno --</option>';
    gradeForm.classList.add('hidden');
}

function clearGradeInputs() {
    const inputs = ['parcial1', 'parcial2', 'parcial3', 'promedio', 'suma'];
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
            clearError(input);
        }
    });
}

function refreshAllComponents() {
    console.log('Actualizando componentes con', students.length, 'estudiantes');
    updateAllSelectors();
    updateStats();
    renderStudentsList();
    updateExtraordinaryList();
}

function updateAllSelectors() {
    console.log('Actualizando selectores...');
    updateStudentSelector('studentSelect');
    updateStudentSelector('gradeStudentSelect');
}

function updateStudentSelector(selectId) {
    const selector = document.getElementById(selectId);
    if (!selector) {
        console.warn('Selector no encontrado:', selectId);
        return;
    }
    
    const currentValue = selector.value;
    
    // Limpiar opciones existentes
    selector.innerHTML = '';
    
    // Agregar opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Selecciona un alumno --';
    selector.appendChild(defaultOption);
    
    // Agregar estudiantes
    console.log('Agregando', students.length, 'estudiantes al selector', selectId);
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name;
        selector.appendChild(option);
    });
    
    // Restaurar selección si es posible
    if (currentValue && students.some(s => s.id === parseInt(currentValue))) {
        selector.value = currentValue;
    }
    
    console.log('Selector', selectId, 'actualizado con', selector.options.length - 1, 'estudiantes');
}

function renderStudentsList() {
    const studentsContainer = document.getElementById('studentsContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (!studentsContainer) return;
    
    console.log('Renderizando lista de estudiantes:', students.length, 'estudiantes');
    
    if (students.length === 0) {
        emptyState.style.display = 'block';
        Array.from(studentsContainer.children).forEach(child => {
            if (child.id !== 'emptyState') {
                child.remove();
            }
        });
        return;
    }
    
    emptyState.style.display = 'none';
    
    Array.from(studentsContainer.children).forEach(child => {
        if (child.id !== 'emptyState') {
            child.remove();
        }
    });
    
    students.forEach(student => {
        const studentElement = createStudentElement(student);
        studentsContainer.appendChild(studentElement);
    });
}

function createStudentElement(student) {
    const studentDiv = document.createElement('div');
    studentDiv.className = 'student-item';
    
    const statusClass = student.status === 'EXTRAORDINARIO' ? 'extraordinary' : 'regular';
    const statusLabel = student.status === 'EXTRAORDINARIO' ? 'EXTRAORDINARIO' : 'REGULAR';
    
    studentDiv.innerHTML = `
        <div class="student-header ${student.status === 'EXTRAORDINARIO' ? 'extraordinary' : ''}" data-student-id="${student.id}">
            <div class="student-info">
                <h3 class="student-name">${student.name}</h3>
                <span class="student-status ${statusClass}">${statusLabel}</span>
            </div>
            <div class="student-actions">
                <button class="btn-delete" data-student-id="${student.id}">Eliminar Alumno</button>
                <span class="expand-icon">▼</span>
            </div>
        </div>
        <div class="subjects-container" data-student-id="${student.id}">
            <div class="subjects-list">
                ${createSubjectsContent(student)}
            </div>
        </div>
    `;
    
    const header = studentDiv.querySelector('.student-header');
    const deleteBtn = studentDiv.querySelector('.btn-delete');
    
    header.addEventListener('click', function(e) {
        if (e.target.closest('.btn-delete')) return;
        toggleStudent(student.id);
    });
    
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        deleteStudent(student.id);
    });
    
    return studentDiv;
}

function createSubjectsContent(student) {
    if (student.subjects.length === 0) {
        return '<p class="empty-state">Este alumno no tiene materias registradas</p>';
    }
    
    let content = `
        <div class="subjects-header">
            <span>Materia</span>
            <span>Parcial 1</span>
            <span>Parcial 2</span>
            <span>Parcial 3</span>
            <span>Promedio</span>
            <span>Suma</span>
            <span>Estado</span>
            <span>Acciones</span>
        </div>
    `;
    
    student.subjects.forEach(subject => {
        const hasGrades = subject.parcial1 !== null;
        
        content += `
            <div class="subject-item">
                <span class="subject-name">${subject.name}</span>
                <span class="subject-grade ${hasGrades ? (subject.parcial1 < 6 ? 'failed' : 'passed') : ''}">
                    ${hasGrades ? subject.parcial1.toFixed(1) : '-'}
                </span>
                <span class="subject-grade ${hasGrades ? (subject.parcial2 < 6 ? 'failed' : 'passed') : ''}">
                    ${hasGrades ? subject.parcial2.toFixed(1) : '-'}
                </span>
                <span class="subject-grade ${hasGrades ? (subject.parcial3 < 6 ? 'failed' : 'passed') : ''}">
                    ${hasGrades ? subject.parcial3.toFixed(1) : '-'}
                </span>
                <span class="subject-average ${hasGrades ? (subject.average < 6 ? 'failed' : 'passed') : ''}">
                    ${hasGrades ? subject.average.toFixed(2) : '-'}
                </span>
                <span class="subject-sum ${hasGrades && subject.sum < 18 ? 'low' : ''}">
                    ${hasGrades ? subject.sum.toFixed(1) : '-'}
                </span>
                <span class="subject-status">
                    ${hasGrades ? `<span class="status-badge ${subject.status === 'APROBADA' ? 'approved' : 'failed'}">${subject.status}</span>` : '-'}
                </span>
                <div class="subject-actions">
                    <button class="btn-edit" data-student-id="${student.id}" data-subject-id="${subject.id}">Editar</button>
                    <button class="btn-remove" data-student-id="${student.id}" data-subject-id="${subject.id}">Eliminar</button>
                </div>
            </div>
        `;
    });
    
    setTimeout(() => {
        const editBtns = document.querySelectorAll(`.btn-edit[data-student-id="${student.id}"]`);
        const removeBtns = document.querySelectorAll(`.btn-remove[data-student-id="${student.id}"]`);
        
        editBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const studentId = parseInt(btn.dataset.studentId);
                const subjectId = parseInt(btn.dataset.subjectId);
                editSubjectGrades(studentId, subjectId);
            });
        });
        
        removeBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const studentId = parseInt(btn.dataset.studentId);
                const subjectId = parseInt(btn.dataset.subjectId);
                removeSubject(studentId, subjectId);
            });
        });
    }, 0);
    
    return content;
}

function toggleStudent(studentId) {
    const container = document.querySelector(`[data-student-id="${studentId}"].subjects-container`);
    const header = document.querySelector(`[data-student-id="${studentId}"].student-header`);
    
    if (container && header) {
        const isExpanded = header.classList.contains('expanded');
        
        if (isExpanded) {
            header.classList.remove('expanded');
            container.classList.remove('expanded');
        } else {
            header.classList.add('expanded');
            container.classList.add('expanded');
        }
    }
}

function toggleAllStudents(expand) {
    students.forEach(student => {
        const container = document.querySelector(`[data-student-id="${student.id}"].subjects-container`);
        const header = document.querySelector(`[data-student-id="${student.id}"].student-header`);
        
        if (container && header) {
            if (expand) {
                header.classList.add('expanded');
                container.classList.add('expanded');
            } else {
                header.classList.remove('expanded');
                container.classList.remove('expanded');
            }
        }
    });
}

function editSubjectGrades(studentId, subjectId) {
    const gradeStudentSelect = document.getElementById('gradeStudentSelect');
    const gradeSubjectSelect = document.getElementById('gradeSubjectSelect');
    
    gradeStudentSelect.value = studentId;
    handleGradeStudentChange();
    
    setTimeout(() => {
        gradeSubjectSelect.value = subjectId;
        handleGradeSubjectChange();
        
        document.getElementById('gradeForm').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function removeSubject(studentId, subjectId) {
    const student = students.find(s => s.id === studentId);
    const subject = student.subjects.find(sub => sub.id === subjectId);
    
    showConfirmModal(
        `¿Estás seguro de que deseas eliminar la materia "${subject.name}" del alumno "${student.name}"?`,
        () => {
            student.subjects = student.subjects.filter(sub => sub.id !== subjectId);
            student.status = determineStudentStatus(student);
            
            saveUserData();
            refreshAllComponents();
            clearGradeForm();
        }
    );
}

function deleteStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    
    showConfirmModal(
        `¿Estás seguro de que deseas eliminar al alumno "${student.name}" y todas sus materias?`,
        () => {
            students = students.filter(s => s.id !== studentId);
            
            saveUserData();
            refreshAllComponents();
            clearGradeForm();
        }
    );
}

function handleClearAll() {
    if (students.length === 0) return;
    
    showConfirmModal(
        '¿Estás seguro de que deseas eliminar todos los alumnos y sus datos?',
        () => {
            students = [];
            nextStudentId = 1;
            nextSubjectId = 1;
            
            saveUserData();
            refreshAllComponents();
            clearGradeForm();
        }
    );
}

function updateStats() {
    const regularCount = students.filter(s => s.status === 'REGULAR').length;
    const extraordinaryCount = students.filter(s => s.status === 'EXTRAORDINARIO').length;
    
    let approvedSubjects = 0;
    let failedSubjects = 0;
    
    students.forEach(student => {
        student.subjects.forEach(subject => {
            if (subject.status === 'APROBADA') {
                approvedSubjects++;
            } else if (subject.status === 'REPROBADA') {
                failedSubjects++;
            }
        });
    });
    
    const regularCountEl = document.getElementById('regularCount');
    const extraordinaryCountEl = document.getElementById('extraordinaryCount');
    const approvedSubjectsEl = document.getElementById('approvedSubjects');
    const failedSubjectsEl = document.getElementById('failedSubjects');
    
    if (regularCountEl) regularCountEl.textContent = regularCount;
    if (extraordinaryCountEl) extraordinaryCountEl.textContent = extraordinaryCount;
    if (approvedSubjectsEl) approvedSubjectsEl.textContent = approvedSubjects;
    if (failedSubjectsEl) failedSubjectsEl.textContent = failedSubjects;
}

function updateExtraordinaryList() {
    const extraordinarySection = document.getElementById('extraordinaryList');
    const extraordinaryStudents = document.getElementById('extraordinaryStudents');
    
    if (!extraordinarySection || !extraordinaryStudents) return;
    
    const extraordinaryList = students.filter(s => s.status === 'EXTRAORDINARIO');
    
    if (extraordinaryList.length === 0) {
        extraordinarySection.classList.add('hidden');
        return;
    }
    
    extraordinarySection.classList.remove('hidden');
    extraordinaryStudents.innerHTML = '';
    
    extraordinaryList.forEach(student => {
        const failedSubjects = student.subjects.filter(sub => sub.status === 'REPROBADA').length;
        const lowSumSubjects = student.subjects.filter(sub => sub.sum !== null && sub.sum < 18).length;
        
        let reason = `${failedSubjects} materias reprobadas`;
        if (lowSumSubjects > 0) {
            reason += `, ${lowSumSubjects} con suma < 18`;
        }
        
        const div = document.createElement('div');
        div.className = 'extraordinary-item';
        div.innerHTML = `
            <div class="extraordinary-info">
                <div class="extraordinary-name">${student.name}</div>
                <div class="extraordinary-reason">${reason}</div>
            </div>
        `;
        
        extraordinaryStudents.appendChild(div);
    });
}

function showConfirmModal(message, callback) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    
    if (confirmMessage) {
        confirmMessage.textContent = message;
    }
    
    pendingAction = callback;
    
    if (confirmModal) {
        confirmModal.classList.remove('hidden');
    }
}

function hideModal() {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
        confirmModal.classList.add('hidden');
    }
    pendingAction = null;
}

function handleConfirmYes() {
    if (pendingAction) {
        pendingAction();
    }
    hideModal();
}

function handleConfirmNo() {
    hideModal();
}

function showNotification(title, message) {
    const notificationModal = document.getElementById('notificationModal');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (notificationTitle) notificationTitle.textContent = title;
    if (notificationMessage) notificationMessage.textContent = message;
    if (notificationModal) notificationModal.classList.remove('hidden');
}

function hideNotificationModal() {
    const notificationModal = document.getElementById('notificationModal');
    if (notificationModal) {
        notificationModal.classList.add('hidden');
    }
}

function showError(input, message) {
    clearError(input);
    input.classList.add('error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    input.parentNode.appendChild(errorDiv);
}

function clearError(input) {
    input.classList.remove('error');
    const errorMessage = input.parentNode.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        showError(field, message);
        field.focus();
    }
}

function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const errorMessages = form.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.remove());
        
        const errorFields = form.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));
    }
}

function clearAllForms() {
    const forms = ['registerForm', 'loginForm'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            clearFormErrors(formId);
        }
    });
    
    clearGradeForm();
}

// Extender el timeout de sesión con actividad del usuario
document.addEventListener('click', startSessionTimeout);
document.addEventListener('keypress', startSessionTimeout);