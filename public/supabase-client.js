// Общие функции для работы с Supabase

(function () {
  let client = null;

  function isConfigured() {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey) return false;
    return !cfg.url.includes("YOUR_PROJECT") && !cfg.anonKey.includes("YOUR_ANON");
  }

  function getClient() {
    if (!isConfigured()) {
      throw new Error("Настройте public/config.js — укажите URL и anon key из Supabase");
    }
    if (!client) {
      client = window.supabase.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.anonKey
      );
    }
    return client;
  }

  function rowToBurial(row) {
    return {
      id: row.id,
      title: row.title,
      location: row.location,
      coordinates: [row.lat, row.lng],
      description: row.description || "",
      persons: Array.isArray(row.persons) ? row.persons : [],
    };
  }

  function burialToRow(burial) {
    const lat = burial.coordinates?.[0];
    const lng = burial.coordinates?.[1];
    return {
      title: burial.title,
      location: burial.location,
      lat,
      lng,
      description: burial.description || "",
      persons: burial.persons || [],
    };
  }

  async function fetchBurials() {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("burials")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    return (data || []).map(rowToBurial);
  }

  async function insertBurial(burial) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("burials")
      .insert(burialToRow(burial))
      .select()
      .single();

    if (error) throw error;
    return rowToBurial(data);
  }

  async function updateBurial(id, burial) {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("burials")
      .update(burialToRow(burial))
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return rowToBurial(data);
  }

  async function deleteBurial(id) {
    const supabase = getClient();
    const { error } = await supabase.from("burials").delete().eq("id", id);
    if (error) throw error;
  }

  async function signIn(email, password) {
    const supabase = getClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const supabase = getClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function getSession() {
    const supabase = getClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  window.BurialDB = {
    isConfigured,
    fetchBurials,
    insertBurial,
    updateBurial,
    deleteBurial,
    signIn,
    signOut,
    getSession,
  };
})();
