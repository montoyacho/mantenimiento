const GITHUB_API_URL = "https://api.github.com";
const REPO_OWNER = "montoyacho"; // Cambia esto por tu usuario de GitHub
const REPO_NAME = "checklist"; // Cambia esto por el nombre de tu repositorio
const FILE_PATH = "data.json"; // Ruta del archivo JSON

const checklist = document.getElementById('checklist');
const completedTasks = document.getElementById('completedTasks');
const moduleInput = document.getElementById('moduleInput');

window.onload = async () => {
    const savedData = await loadDataFromGitHub();
    if (savedData) {
        moduleInput.value = savedData.moduleName || "";
        savedData.tasks.forEach(task => restoreTask(task));
    }
};

document.querySelectorAll('.dropzone').forEach(dropzone => {
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0], dropzone);
    });

    dropzone.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => handleFile(e.target.files[0], dropzone);
        input.click();
    });
});

async function handleFile(file, dropzone) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = file.name;
        img.width = 100;

        const parentLi = dropzone.closest('li');
        dropzone.textContent = '';
        dropzone.appendChild(img);
        parentLi.classList.add('completed');

        await saveTask(parentLi, e.target.result);
        moveToCompleted(parentLi);
    };
    reader.readAsDataURL(file);
}

function moveToCompleted(task) {
    checklist.removeChild(task);
    completedTasks.appendChild(task);
}

function showCompletedTasks() {
    completedTasks.style.display = completedTasks.style.display === 'none' ? 'block' : 'none';
}

async function saveTask(task, imageBase64) {
    const moduleName = moduleInput.value.trim();
    const data = {
        moduleName: moduleName,
        tasks: [
            ...Array.from(checklist.querySelectorAll('li')).map(li => ({
                id: li.getAttribute('data-id'),
                name: li.querySelector('span').textContent.trim(),
                completed: li.classList.contains('completed')
            })),
            ...Array.from(completedTasks.querySelectorAll('li')).map(li => ({
                id: li.getAttribute('data-id'),
                name: li.querySelector('span').textContent.trim(),
                completed: true
            }))
        ]
    };
    await saveDataToGitHub(data);
}

async function saveDataToGitHub(data) {
    const url = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    let sha = null;
    try {
        const response = await fetch(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` } // Token cargado desde config.js
        });
        if (response.ok) {
            const fileData = await response.json();
            sha = fileData.sha; // Necesario para actualizar el archivo
        }
    } catch {
        console.log("Archivo nuevo, se creará uno nuevo.");
    }

    const content = btoa(JSON.stringify(data, null, 2));
    const response = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`, // Token cargado desde config.js
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Actualización de datos desde la aplicación",
            content: content,
            sha: sha
        })
    });

    if (!response.ok) {
        console.error("Error al guardar los datos en GitHub", await response.json());
    }
}

async function loadDataFromGitHub() {
    const url = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    try {
        const response = await fetch(url, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` } // Token cargado desde config.js
        });
        if (response.ok) {
            const fileData = await response.json();
            return JSON.parse(atob(fileData.content)); // Decodifica el contenido de Base64 a JSON
        }
    } catch {
        console.log("No se encontró el archivo, se creará uno nuevo.");
    }
    return { moduleName: "", tasks: [] };
}

function restoreTask(taskData) {
    const task = checklist.querySelector(`[data-id="${taskData.id}"]`);
    if (task) {
        task.querySelector('span').textContent = taskData.name || `Tarea ${taskData.id}`;
        const dropzone = task.querySelector('.dropzone');
        dropzone.textContent = '';

        if (taskData.image) {
            const img = document.createElement('img');
            img.src = taskData.image;
            img.alt = taskData.name;
            img.width = 100;
            dropzone.appendChild(img);
        }

        if (taskData.completed) {
            task.classList.add('completed');
            completedTasks.appendChild(task);
        }
    }
}

function updateModule() {
    const moduleName = moduleInput.value.trim();
    saveTask(null, null); // Guarda los cambios en el nombre del módulo
}

function clearAllData() {
    saveDataToGitHub({ moduleName: "", tasks: [] });
    location.reload();
}
