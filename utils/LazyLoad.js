

const loadedScripts = {};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    
    if (loadedScripts[src]) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    
    script.onload = () => {
      loadedScripts[src] = true;
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    
    document.head.appendChild(script);
  });
}

const componentCache = {};

async function lazyLoad(componentName, path) {
  if (componentCache[componentName]) {
    return componentCache[componentName];
  }
  
  /* Component may already be available via a deferred <script> tag */
  if (window[componentName]) {
    componentCache[componentName] = window[componentName];
    return window[componentName];
  }
  
  try {
    await loadScript(path);
    
    const component = window[componentName];
    if (!component) {
      throw new Error(`Component ${componentName} not found after loading ${path}`);
    }
    componentCache[componentName] = component;
    return component;
  } catch (error) {
    throw error;
  }
}