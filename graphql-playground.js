const examples = [
  {category:'Getting started',name:'Health check',description:'Confirm the GraphQL resolver is responding.',query:`query Health { health }`},
  {category:'Getting started',name:'Plugin overview',description:'Get a quick overview of every registered SDK plugin.',query:`query PluginOverview { plugins { id name state operations } }`},
  {category:'Getting started',name:'Plugin details',description:'Include versions, descriptions and initialization errors.',query:`query PluginDetails { plugins { id name description version state operations error } }`},
  {category:'Getting started',name:'Recent SDK events',description:'Get the 10 latest SDK events. Change limit in Variables.',query:`query RecentEvents($limit: Int) { events(limit: $limit) { timestamp type payload } }`,variables:{limit:10}},
  {category:'Getting started',name:'System snapshot',description:'Fetch health, plugin states, and recent SDK activity in one request.',query:`query SystemSnapshot { health plugins { id state } events(limit: 5) { timestamp type } }`},
  {category:'MySQL',name:'List MySQL notes',description:'Read saved notes from the real Rusteze database.',query:`query ListNotes { notes { id text createdAt } }`},
  {category:'MySQL',name:'Add MySQL note',description:'Insert a persistent note using a GraphQL mutation.',query:`mutation AddNote($text: String!) { addNote(text: $text) { id text result } }`,variables:{text:'SDK rust removed, one mutation at a time.'},mutates:true},
  {category:'MySQL',name:'Notes via generic SDK',description:'Read notes through the generic executePlugin resolver.',query:`query NotesViaSdk { executePlugin(pluginId: "mysql", operation: "listNotes", input: {}) }`},
  {category:'Storage',name:'List stored files',description:'List files in the sandboxed server storage directory.',query:`query StorageFiles { executePlugin(pluginId: "storage", operation: "listFiles", input: {}) }`},
  {category:'Storage',name:'Write a sample file',description:'Create or overwrite a sample text file on the server.',query:`mutation WriteSampleFile { executePlugin(pluginId: "storage", operation: "writeFile", input: { name: "graphql-demo.txt", content: "Rust-eze says hello from GraphQL!" }) }`,mutates:true},
  {category:'Storage',name:'Read sample file',description:'Read graphql-demo.txt after running the Write example.',query:`query ReadSampleFile { executePlugin(pluginId: "storage", operation: "readFile", input: { name: "graphql-demo.txt" }) }`},
  {category:'Notifications',name:'Notification history',description:'Show previously simulated notifications (no real email sent).',query:`query NotificationHistory { executePlugin(pluginId: "notifications", operation: "history", input: {}) }`},
  {category:'Notifications',name:'Simulate a notification',description:'Add a sample notification to in-memory history; no email is sent.',query:`mutation SimulateNotification { executePlugin(pluginId: "notifications", operation: "send", input: { recipient: "interviewer@example.com", message: "Good news: the SDK is rust-free!" }) }`,mutates:true},
  {category:'Plugin lifecycle',name:'Disable notifications',description:'Stop the notifications plugin. Its operations will be unavailable until re-enabled.',query:`mutation DisableNotifications { disablePlugin(id: "notifications") { id name state error } }`,mutates:true,warning:'This changes the running plugin state.'},
  {category:'Plugin lifecycle',name:'Enable notifications',description:'Start the notifications plugin after disabling it.',query:`mutation EnableNotifications { enablePlugin(id: "notifications") { id name state error } }`,mutates:true},
  {category:'Plugin lifecycle',name:'Disable storage',description:'Demonstrate plugin lifecycle controls using file storage.',query:`mutation DisableStorage { disablePlugin(id: "storage") { id name state error } }`,mutates:true,warning:'Storage operations will stop until you re-enable the plugin.'},
  {category:'Plugin lifecycle',name:'Enable storage',description:'Restore the file storage plugin.',query:`mutation EnableStorage { enablePlugin(id: "storage") { id name state error } }`,mutates:true},
  {category:'Plugin lifecycle',name:'Enable MySQL',description:'Reconnect the MySQL plugin if it has been disabled.',query:`mutation EnableMySQL { enablePlugin(id: "mysql") { id name state error } }`,mutates:true},
  {category:'Schema explorer',name:'Root operations',description:'Discover the available top-level queries and mutations.',query:`query RootOperations { __schema { queryType { name fields { name description } } mutationType { name fields { name description } } } }`},
  {category:'Schema explorer',name:'Plugin type fields',description:'Inspect the SDK plugin GraphQL type and its fields.',query:`query PluginTypeFields { __type(name: "SdkPlugin") { name kind fields { name type { kind name ofType { kind name } } } } }`},
  {category:'Schema explorer',name:'Full schema outline',description:'Discover all GraphQL types and their kinds.',query:`query SchemaOutline { __schema { types { name kind } } }`}
];

const $ = id => document.getElementById(id);
const select = $('example');
const search = $('example-search');
const items = $('example-list');
const categories = [...new Set(examples.map(item => item.category))];
const byName = new Map(examples.map(item => [item.name,item]));
let selected = examples[0];

for (const category of categories) {
  const group = document.createElement('optgroup');
  group.label = category;
  for (const item of examples.filter(entry => entry.category === category)) {
    const option = document.createElement('option');
    option.value = item.name;
    option.textContent = item.name;
    group.append(option);
  }
  select.append(group);
}

function renderList() {
  const filter = search.value.trim().toLowerCase();
  items.replaceChildren();
  let count = 0;
  for (const category of categories) {
    const groupItems = examples.filter(item => item.category === category && `${item.name} ${item.description} ${item.query}`.toLowerCase().includes(filter));
    if (!groupItems.length) continue;
    const heading = document.createElement('h3');
    heading.textContent = category;
    items.append(heading);
    for (const item of groupItems) {
      count++;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'example-item' + (item === selected ? ' selected' : '');
      button.setAttribute('aria-pressed',String(item === selected));
      const title = document.createElement('strong');
      title.textContent = item.name;
      const description = document.createElement('small');
      description.textContent = item.description;
      const kind = document.createElement('span');
      kind.className = item.mutates ? 'operation-kind mutation' : 'operation-kind';
      kind.textContent = item.mutates ? 'MUTATION' : 'QUERY';
      button.append(title,description,kind);
      button.addEventListener('click',() => choose(item));
      items.append(button);
    }
  }
  if (!count) {
    const none = document.createElement('p');
    none.textContent = 'No matching examples. Even GraphQL cannot query a missing query.';
    items.append(none);
  }
  $('example-count').textContent = `${examples.length} ready-to-run examples`;
}

function choose(item) {
  selected = item;
  select.value = item.name;
  $('query').value = item.query;
  $('variables').value = JSON.stringify(item.variables || {}, null, 2);
  $('selection-description').textContent = item.description;
  $('selection-warning').textContent = item.warning || (item.mutates ? 'This mutation changes demo data or plugin state. Execute only when ready.' : 'Read-only query. Nothing runs until you click Execute GraphQL.');
  $('selection-warning').classList.toggle('warning',Boolean(item.mutates));
  $('result').textContent = 'Example loaded. Execute when ready—no surprise database migrations.';
  $('status').textContent = 'Ready';
  renderList();
}
select.addEventListener('change',() => choose(byName.get(select.value)));
search.addEventListener('input',renderList);
choose(examples[0]);

$('run').addEventListener('click',async () => {
  const button = $('run');
  let variables;
  try { variables=JSON.parse($('variables').value || '{}'); }
  catch (error) { $('result').textContent='Invalid variables JSON: '+error.message;return; }
  button.disabled=true;
  $('status').textContent='Request in progress';
  try {
    const response=await fetch('/graphql',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':$('api-key').value},body:JSON.stringify({query:$('query').value,variables})});
    const responseText=await response.text();
    let data;
    try { data=JSON.parse(responseText); } catch { data={response:responseText}; }
    $('result').textContent=JSON.stringify(data,null,2);
    $('status').textContent='HTTP '+response.status;
  } catch (error) { $('result').textContent=String(error);$('status').textContent='Network error'; }
  finally { button.disabled=false; }
});
$('copy').addEventListener('click',async () => {
  try { await navigator.clipboard.writeText($('query').value);$('status').textContent='Query copied'; }
  catch { $('status').textContent='Select the query to copy'; }
});
