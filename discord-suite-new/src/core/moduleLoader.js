async function loadModules(client, context, modules) {
  for (const mod of modules) {
    try {
      await mod.setup(client, context);
      console.log(`✅ Module: ${mod.name}`);
    } catch (error) {
      console.error(`❌ Module failed: ${mod.name}`);
      console.error(error);
    }
  }
}

module.exports = { loadModules };
