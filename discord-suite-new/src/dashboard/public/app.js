let state = { data: null };
const guildSelect = document.getElementById("guildSelect");
const params = new URLSearchParams(location.search);
const requestedGuild = params.get("guild");
const requestedTab = params.get("tab");

function esc(text){const d=document.createElement("div");d.textContent=text??"";return d.innerHTML}
function options(select, items, placeholder="اختر"){select.innerHTML=`<option value="">${esc(placeholder)}</option>`+items.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join("")}
function setSelected(id,value){const el=document.getElementById(id);if(el&&value!=null)el.value=value}
function showNotice(msg){const n=document.getElementById("notice");n.textContent=msg;n.classList.remove("hidden");setTimeout(()=>n.classList.add("hidden"),4000)}

function activateTab(tab){
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  document.querySelectorAll(".tab").forEach(s=>s.classList.toggle("active",s.id===`tab-${tab}`));
}
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>activateTab(b.dataset.tab)));

function fillCheckGrid(containerId, items, name, checkedIds=[]){
  const box=document.getElementById(containerId);box.innerHTML=items.map(i=>`<label class="check-item"><input type="checkbox" name="${name}" value="${i.id}" ${checkedIds.includes(i.id)?"checked":""}> ${esc(i.name)}</label>`).join("");
}

function render(data){
  state.data=data;
  const {guild,roles,channels,permissionNames,settings}=data;
  document.querySelectorAll(".guild-id").forEach(x=>x.value=guild.id);
  document.getElementById("guildName").textContent=guild.name;
  document.getElementById("guildStats").textContent=`${guild.memberCount} عضو`;
  document.getElementById("guildMeta").textContent=guild.name;
  document.getElementById("roleCount").textContent=roles.length;
  document.getElementById("channelCount").textContent=channels.length;
  document.getElementById("memberCount").textContent=guild.memberCount;
  const icon=document.getElementById("guildIcon"); if(guild.icon){icon.src=guild.icon;icon.style.display="block"}else{icon.style.display="none"}

  const textChannels=channels.filter(c=>c.type===0);
  const categories=channels.filter(c=>c.type===4);
  const editableRoles=roles.filter(r=>r.editable&&!r.managed&&r.id!==guild.id);
  document.querySelectorAll(".text-channels").forEach(s=>options(s,textChannels,"اختر روم"));
  document.querySelectorAll(".categories").forEach(s=>options(s,categories,"بدون Category"));
  document.querySelectorAll(".editable-roles").forEach(s=>options(s,editableRoles,"اختر رول"));

  const t=settings.tickets||{};
  document.getElementById("ticketEnabled").checked=t.enabled!==false;
  setSelected("ticketPanelChannel",t.panelChannelId); setSelected("ticketCategory",t.categoryId); setSelected("ticketTranscript",t.transcriptChannelId);
  setSelected("ticketButtonStyle",t.buttonStyle||"Primary");
  document.getElementById("ticketTitle").value=t.panelTitle||"الدعم";
  document.getElementById("ticketDescription").value=t.panelDescription||"اضغط الزر لفتح تذكرة.";
  document.getElementById("ticketColor").value=t.panelColor||"#5865F2";
  document.getElementById("ticketImage").value=t.panelImage||"";
  document.getElementById("ticketButtonLabel").value=t.buttonLabel||"فتح تذكرة";
  document.getElementById("ticketButtonEmoji").value=t.buttonEmoji||"🎫";
  document.getElementById("ticketNamePattern").value=t.ticketNamePattern||"ticket-{user}";
  document.getElementById("ticketWelcome").value=t.welcomeMessage||"أهلاً {user}، اكتب مشكلتك.";
  document.getElementById("ticketCloseLabel").value=t.closeLabel||"إغلاق التذكرة";
  document.getElementById("ticketCloseEmoji").value=t.closeEmoji||"🔒";
  fillCheckGrid("ticketStaffRoles",editableRoles,"staffRoleIds",t.staffRoleIds||[]);
  fillCheckGrid("cloneTargets",editableRoles,"targetRoleIds",[]);

  const permissionGrid=document.getElementById("permissionGrid");
  permissionGrid.innerHTML=permissionNames.map(p=>`<label class="check-item"><input class="perm-box" type="checkbox" name="permissions" value="${p}"> ${p}</label>`).join("");
  window.__editableRoles=editableRoles;
  const roleSelect=document.getElementById("roleEditorSelect");
  if(roleSelect.options.length>1) roleSelect.selectedIndex=1;
  renderRoleEditor();
}

function renderRoleEditor(){
  const select=document.getElementById("roleEditorSelect");
  const role=(window.__editableRoles||[]).find(r=>r.id===select.value);
  if(!role)return;
  document.getElementById("roleName").value=role.name;
  document.getElementById("roleColor").value=role.color==="#000000"?"#5865F2":role.color;
  document.getElementById("roleHoist").checked=role.hoist;
  document.getElementById("roleMentionable").checked=role.mentionable;
  document.querySelectorAll(".perm-box").forEach(b=>b.checked=role.permissions.includes(b.value));
}
document.getElementById("roleEditorSelect").addEventListener("change",renderRoleEditor);

async function loadGuild(id){
  if(!id)return;
  try{const r=await fetch(`/api/guild/${id}`);const data=await r.json();if(!r.ok)throw new Error(data.error||"خطأ");render(data);history.replaceState(null,"",`/?guild=${id}&tab=${document.querySelector('.nav.active')?.dataset.tab||'home'}`)}catch(e){showNotice(e.message)}
}
guildSelect.addEventListener("change",()=>loadGuild(guildSelect.value));

const manageChannel=document.getElementById("messageManageChannel");
manageChannel.addEventListener("change",async()=>{
  const guildId=guildSelect.value,channelId=manageChannel.value,recent=document.getElementById("recentBotMessages");
  document.getElementById("editChannelId").value=channelId;document.getElementById("deleteChannelId").value=channelId;
  if(!channelId)return;
  const r=await fetch(`/messages/recent/${guildId}/${channelId}`);const items=await r.json();
  recent.innerHTML='<option value="">اختر رسالة</option>'+items.map(m=>`<option value="${m.id}">${esc((m.content||'').slice(0,70))}</option>`).join('');
});
document.getElementById("recentBotMessages").addEventListener("change",e=>{document.getElementById("editMessageId").value=e.target.value;document.getElementById("deleteMessageId").value=e.target.value});

if(requestedGuild&&[...guildSelect.options].some(o=>o.value===requestedGuild))guildSelect.value=requestedGuild;
if(requestedTab)activateTab(requestedTab);
if(guildSelect.value)loadGuild(guildSelect.value);
