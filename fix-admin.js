/**
 * fix-admin.js - Comprehensive admin.html fix script
 * Run with: node fix-admin.js
 */
const fs = require('fs');
let lines = fs.readFileSync('./public/admin.html', 'utf8').split('\n');
const origLen = lines.length;

// ── STEP 1: Remove duplicate functions (reverse order to preserve indices) ──
// 9. Delete lines 1624-1666 (second renderSettings)
lines.splice(1623, 43);
// 8. Delete lines 1594-1622 (second renderUsers)
lines.splice(1593, 29);
// 7. Delete lines 1555-1583 (second renderAnalytics)
lines.splice(1554, 29);
// 6. Delete lines 1526-1553 (second renderPartners)
lines.splice(1525, 28);
// 5. Delete lines 1487-1524 (second renderCMS)
lines.splice(1486, 38);
// 4. Delete lines 1461-1485 (second renderMedia)
lines.splice(1460, 25);
// 3. Delete lines 1428-1459 (second renderCustomers)
lines.splice(1427, 32);
// 2. Delete lines 1403-1426 (second renderActivities)
lines.splice(1402, 24);
// 1. Delete lines 1248-1311 (second renderBookings)
lines.splice(1247, 64);

console.log('Lines removed:', origLen - lines.length, '(expected 312)');

let html = lines.join('\n');

// ── STEP 2: Fix renderTripCard - quote string IDs in onclick ──
// Fix editTrip onclick
html = html.replace(
  "+'<button class=\"btn btn-secondary btn-sm\" style=\"flex:1\" onclick=\"editTrip('+t.id+')\">✏️ Modifier</button>'",
  "+'<button class=\"btn btn-secondary btn-sm\" style=\"flex:1\" onclick=\"editTrip(\\''+t.id+'\\')\" >✏️ Modifier</button>'"
);
// Fix deleteItem onclick
html = html.replace(
  "+'<button class=\"btn btn-danger btn-sm btn-icon\" onclick=\"deleteItem(\\'trips\\','+t.id+')\">🗑</button>'",
  "+'<button class=\"btn btn-danger btn-sm btn-icon\" onclick=\"deleteItem(\\'trips\\',\\''+t.id+'\\')\">🗑</button>'"
);

// ── STEP 3: Fix saveBooking - use string tripId + POST to API ──
const oldSaveBooking = `function saveBooking() {
  var cust = document.getElementById('mbCust').value;
  var email = document.getElementById('mbEmail').value;
  var tripId = parseInt(document.getElementById('mbTrip').value);
  if (!cust || !email || !tripId) { showToast('Please fill required fields','error'); return; }
  var trip = DB.trips.find(function(t){ return t.id === tripId; });
  var adults = parseInt(document.getElementById('mbAdults').value)||1;
  var ref = 'RC-'+Math.random().toString(36).substr(2,4).toUpperCase()+Date.now().toString().slice(-3);
  DB.bookings.unshift({
    id:ref, tripId:tripId, tripTitle:trip.title,
    customer:cust, email:email,
    phone:document.getElementById('mbPhone').value,
    nationality:document.getElementById('mbNat').value||'—',
    adults:adults, children:0,
    date:document.getElementById('mbDate').value,
    total:trip.price*adults,
    status:document.getElementById('mbStatus').value,
    payment:document.getElementById('mbPay').value,
    notes:document.getElementById('mbNotes').value,
    created:new Date().toISOString().split('T')[0]
  });
  closeModal(); goPage('bookings');
  showToast('Booking '+ref+' created','success');
}`;

const newSaveBooking = `function saveBooking() {
  var cust = document.getElementById('mbCust').value;
  var email = document.getElementById('mbEmail').value;
  var tripId = document.getElementById('mbTrip').value;
  if (!cust || !email || !tripId) { showToast('Please fill required fields','error'); return; }
  var trip = DB.trips.find(function(t){ return t.id === tripId; });
  if (!trip) { showToast('Trip not found','error'); return; }
  var adults = parseInt(document.getElementById('mbAdults').value)||1;
  var phone = document.getElementById('mbPhone').value || '—';
  var body = {
    expId: tripId, expTitle: trip.title,
    expImg: trip.img || '', expLoc: trip.destination || '',
    duration: trip.dur || '', segment: trip.segment || '', type: trip.type || '',
    name: cust, email: email, phone: phone,
    country: document.getElementById('mbNat').value || 'Morocco',
    date: document.getElementById('mbDate').value,
    adults: adults, children: 0,
    total: trip.price * adults,
    notes: document.getElementById('mbNotes').value,
    status: document.getElementById('mbStatus').value,
    payment: document.getElementById('mbPay').value
  };
  api('POST', '/bookings', body).then(function(d) {
    if (d.error) { showToast(d.error, 'error'); return; }
    DB.bookings.unshift(mapBk(d.booking));
    closeModal(); goPage('bookings');
    showToast('Booking ' + d.ref + ' created', 'success');
    updatePendingBadge();
  }).catch(function() { showToast('Network error', 'error'); });
}`;

if (html.includes(oldSaveBooking)) {
  html = html.replace(oldSaveBooking, newSaveBooking);
  console.log('saveBooking fixed');
} else {
  console.log('WARN: saveBooking pattern not found - checking for partial match...');
  const partialCheck = "var tripId = parseInt(document.getElementById('mbTrip').value)";
  console.log('Partial match:', html.includes(partialCheck));
}

// ── STEP 4: Fix WhatsApp URL space bug ──
// Fix in sendWhatsAppAuto
html = html.replace(
  "window.open('https://wa.me/'+b.phone.replace(/\\D/g,'')+' ?text='+msg, '_blank')",
  "window.open('https://wa.me/'+b.phone.replace(/\\D/g,'')+'?text='+msg, '_blank')"
);
// Fix in sendWhatsApp
html = html.replace(
  "window.open('https://wa.me/'+phone.replace(/\\D/g,'')+' ?text='+encodeURIComponent('Hello '+name+', this is Roamers Community!'), '_blank')",
  "window.open('https://wa.me/'+phone.replace(/\\D/g,'')+'?text='+encodeURIComponent('Hello '+name+', this is Roamers Community!'), '_blank')"
);

// ── STEP 5: Fix renderTripCard capacity guard ──
html = html.replace(
  'var pct = Math.round(t.booked/t.capacity*100);',
  'var pct = t.capacity > 0 ? Math.round(t.booked/t.capacity*100) : 0;'
);

// ── STEP 6: Extend loadAll to fetch plan-requests, team-requests, messages ──
const oldLoadAll = `function loadAll(cb) {
  var left = 3;
  function done(){ if(--left===0) cb(); }
  api('GET','/experiences?includeDrafts=1').then(function(d){
    if(d.experiences) DB.trips = d.experiences.map(mapExp);
  }).catch(function(){}).then(done);
  api('GET','/admin/bookings').then(function(d){
    if(d.bookings) DB.bookings = d.bookings.map(mapBk);
  }).catch(function(){}).then(done);
  api('GET','/admin/users').then(function(d){
    if(d.users) DB.customers = d.users.filter(function(u){return u.role!=='admin';}).map(function(u){
      return { id:u.id, name:u.name||u.email, email:u.email, phone:u.phone||'',
        nationality:'', country:'', trips:0, spent:0,
        status:'regular', joined:(u.created||'').split('T')[0] };
    });
  }).catch(function(){}).then(done);
}`;

const newLoadAll = `function loadAll(cb) {
  var left = 6;
  function done(){ if(--left===0) cb(); }
  api('GET','/experiences?includeDrafts=1').then(function(d){
    if(d.experiences) DB.trips = d.experiences.map(mapExp);
  }).catch(function(){}).then(done);
  api('GET','/admin/bookings').then(function(d){
    if(d.bookings) DB.bookings = d.bookings.map(mapBk);
  }).catch(function(){}).then(done);
  api('GET','/admin/users').then(function(d){
    if(d.users) DB.customers = d.users.filter(function(u){return u.role!=='admin';}).map(function(u){
      return { id:u.id, name:u.name||u.email, email:u.email, phone:u.phone||'',
        nationality:'', country:'', trips:0, spent:0,
        status:'regular', joined:(u.created||'').split('T')[0] };
    });
  }).catch(function(){}).then(done);
  api('GET','/admin/plan-requests').then(function(d){
    if(d.requests) {
      DB.notifications = DB.notifications.filter(function(n){ return !String(n.id).startsWith('plan-'); });
      d.requests.filter(function(r){ return r.status==='new'; }).forEach(function(r){
        DB.notifications.unshift({id:'plan-'+r.id,text:'New plan request from '+r.name+(r.destination?' — '+r.destination:''),time:fmtDate(r.created),read:false,type:'booking'});
      });
    }
  }).catch(function(){}).then(done);
  api('GET','/admin/team-requests').then(function(d){
    if(d.requests) {
      DB.notifications = DB.notifications.filter(function(n){ return !String(n.id).startsWith('team-'); });
      d.requests.filter(function(r){ return r.status==='new'; }).forEach(function(r){
        DB.notifications.unshift({id:'team-'+r.id,text:'New team building request from '+(r.company||r.name),time:fmtDate(r.created),read:false,type:'booking'});
      });
    }
  }).catch(function(){}).then(done);
  api('GET','/admin/messages').then(function(d){
    if(d.messages) {
      DB.notifications = DB.notifications.filter(function(n){ return !String(n.id).startsWith('msg-'); });
      d.messages.filter(function(m){ return m.status==='unread'; }).forEach(function(m){
        DB.notifications.unshift({id:'msg-'+m.id,text:'New message from '+m.name+(m.subject?' — '+m.subject:''),time:fmtDate(m.created),read:false,type:'info'});
      });
    }
  }).catch(function(){}).then(done);
}`;

if (html.includes(oldLoadAll)) {
  html = html.replace(oldLoadAll, newLoadAll);
  console.log('loadAll enhanced');
} else {
  console.log('WARN: loadAll pattern not found');
  const partialCheck = "var left = 3;";
  console.log('Partial match (left=3):', html.includes(partialCheck));
}

// ── STEP 7: Fix updatePendingBadge to include plan/team/msg counts ──
const oldBadge = `function updatePendingBadge() {
  var n = DB.bookings.filter(function(b){ return b.status === 'pending'; }).length;
  var badge = document.getElementById('pendingBadge');
  if (badge) { badge.textContent = n; badge.style.display = n ? 'inline-block' : 'none'; }
}`;
const newBadge = `function updatePendingBadge() {
  var n = DB.bookings.filter(function(b){ return b.status === 'pending'; }).length
         + DB.notifications.filter(function(n){ return !n.read; }).length;
  var badge = document.getElementById('pendingBadge');
  if (badge) { badge.textContent = n > 99 ? '99+' : n; badge.style.display = n ? 'inline-block' : 'none'; }
}`;

if (html.includes(oldBadge)) {
  html = html.replace(oldBadge, newBadge);
  console.log('updatePendingBadge improved');
} else {
  console.log('WARN: updatePendingBadge pattern not found');
}

// ── Write result ──
fs.writeFileSync('./public/admin.html', html);
const newLines = html.split('\n').length;
console.log('Final line count:', newLines, '(was', origLen + ')');
console.log('Done!');
