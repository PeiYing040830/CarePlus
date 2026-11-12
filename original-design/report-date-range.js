/* Compiled into reports.js; Malaysia's supplied calendar date avoids UTC shifts. */
function setDateRange(range) {
 const today=document.body.dataset.serverDate||window.CarePlusViewPHP.date('Y-m-d');
 const start=new Date(today+'T00:00:00Z');
 if(range==='week')start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
 else if(range==='month')start.setUTCDate(1);
 else if(range==='year'){start.setUTCMonth(0,1);}
 document.querySelector('input[name="date_from"]').value=start.toISOString().slice(0,10);
 document.querySelector('input[name="date_to"]').value=today;
 document.getElementById('reportFilterForm').requestSubmit();
}
