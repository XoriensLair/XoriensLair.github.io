var loading = false;
if (getCookie('uid') == '') {
    setCookie('uid',sha256(Math.random().toString()),14);
}

var BrowserFingerprint = getCookie('uid');

$(document).ready(function(){ // Setup

    // Dialogs
    $('#modal-back').click(function(){ // Modal background click
        $('#join-dialog').toggleClass('active',false);
        $('#new-dialog').toggleClass('active',false);
        $('#modal-back').toggleClass('active',false);
        $('#rejoin-dialog').toggleClass('active',false);
    });
    $('#rj-no-button').click(function(){ // Modal background click
        $('#modal-back').toggleClass('active',false);
        $('#rejoin-dialog').toggleClass('active',false);
    });
    $('#new-session').click(function(){ // New session button
        loading = false;
        $('#new-dialog').toggleClass('active',true);
        $('#modal-back').toggleClass('active',true);
    });
    $('#join-session').click(function(){ // Join session button
        $('#join-dialog').toggleClass('active',true);
        $('#modal-back').toggleClass('active',true);
    });
    $('#load-session').click(function(){$('#load-input').trigger('click')}); // Trigger file open by proxy for loading

    // Functionality
    $('#join-btn').click(function(){ // Joining a session

        // Validate inputs (basic)
        if ($('#cname-input').val().length == 0) {
            $('#cname-input').toggleClass('invalid',true);
            return;
        } else {
            $('#cname-input').toggleClass('invalid',false);
        }

        if ($('#sid-input').val().length == 0) {
            $('#sid-input').toggleClass('invalid',true);
            return;
        } else {
            $('#sid-input').toggleClass('invalid',false);
        }

        $('#join-dialog').toggleClass('active',false);
        $('#new-dialog').toggleClass('active',false);
        $('#modal-back').toggleClass('active',false);

        // Send command
        command('joinsession',{
            'name':$('#cname-input').val(),
            'id':$('#sid-input').val(),
            'password':$('#psw-input').val(),
            'fingerprint':BrowserFingerprint
        },API_PORT,function(data){
            window.location = 'map.html?id='+data['sid'];
        });
    });

    $('#create-btn').click(function(){ // Creating a new session

        // Validate inputs (basic)
        if ($('#name-input').val().length == 0) {
            $('#name-input').toggleClass('invalid',true);
            return;
        } else {
            $('#name-input').toggleClass('invalid',false);
        }

        $('#join-dialog').toggleClass('active',false);
        $('#new-dialog').toggleClass('active',false);
        $('#modal-back').toggleClass('active',false);

        // Send command

        console.log(BrowserFingerprint);

        if (loading) { // User is loading a previous session from a file
            var fileInput = document.getElementById('load-input');
            var Reader = new FileReader();
            Reader.onload = function(event) {
                command('newsession',{
                    'name':$('#name-input').val(),
                    'id': crc32((Date.now()*Math.random()).toString()),
                    'password':$('#psw-new').val(),
                    'fingerprint':BrowserFingerprint,
                    'session':event.target.result
                },API_PORT,function(data){
                    console.log(data['sid']);
                    window.location = 'map.html?id='+data['sid'];
                });
            };
            Reader.readAsText(fileInput.files[0]);

            return;
        } else { // A blank session is being created
            command('newsession',{
                'name':$('#name-input').val(),
                'id': crc32((Date.now()*Math.random()).toString()),
                'password':$('#psw-new').val(),
                'fingerprint':BrowserFingerprint
            },API_PORT,function(data){
                console.log(data['sid']);
                window.location = 'map.html?id='+data['sid'];
            });
        }
    });

    $('#rj-yes-button').click(function(){ // Join session button
        command('checkuser',{'fingerprint':BrowserFingerprint},API_PORT,function(data){
            if (data['found']) {
                window.location = 'map.html?id='+data['sid'];
            }
        });
    });

    $('#load-input').change(function(){
        loading = true;
        $('#new-dialog').toggleClass('active',true);
        $('#modal-back').toggleClass('active',true);
    });

    command('checkuser',{'fingerprint':BrowserFingerprint},API_PORT,function(data){
        if (data.found) {
            $('#modal-back').toggleClass('active',true);
            $('#rejoin-dialog').toggleClass('active',true);
        }
    });
    
});