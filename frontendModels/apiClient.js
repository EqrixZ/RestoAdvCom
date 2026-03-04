function getApiBase() {
    const fromEnv = process.env.BACKEND_API_BASE;
    if (fromEnv) return fromEnv.replace(/\/+$/, "");
    const backendPort = Number(process.env.BACKEND_PORT || 3005);
    return `http://127.0.0.1:${backendPort}/api`;
}

async function request(path, options = {}) {
    const url = `${getApiBase()}${path}`;
    const response = await fetch(url, options);
    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }
    if (!response.ok || !payload || payload.ok !== true) {
        const detail = payload && (payload.message || payload.detail);
        throw new Error(detail || `API request failed: ${response.status}`);
    }
    return payload.data;
}

module.exports = {
    request
};
