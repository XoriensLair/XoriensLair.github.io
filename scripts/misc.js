$(document).ready(function(){
    // Page setup
    $('#share-link').text(document.location); // Set the share link
    
    var iconKeys = Object.keys(iconIndex);
    for (var i=0;i<iconKeys.length;i++) {
        $(
            '<img src="assets/icons/'+
            iconIndex[iconKeys[i]]+
            '">'
        ).appendTo($([
            '<div class="npc-icon" id="npc-icon-',
            iconKeys[i],
            '" name="',
            iconKeys[i]
            ,'"></div>'
        ].join('')).appendTo($('#npc-icon-select')));
    }

    // Fingerprint setup
    
    setTimeout(function () { // Ready fingerprint generation
        console.log('FINGERPRINT: '+BrowserFingerprint);
        command('checkuser',{'fingerprint':BrowserFingerprint},API_PORT,function(data){
            if (!data['found']) {
                command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,function(data){
                    if (data['code'] == 200) {
                        if (data['hasPassword']) {
                            command('joinsession',{
                                'name':prompt('Enter the name you want to display.'),
                                'id':params.get('id'),
                                'password':prompt('Enter password to join '+data['name']+'.'),
                                'fingerprint':BrowserFingerprint
                            },API_PORT,function(data){
                                if (Object.keys(data).includes('code')) {
                                    if (data['code'] == 403) {
                                        bootbox.alert('Password is incorrect.');
                                        window.location = 'index.html';
                                    } else {
                                        bootbox.alert('That server does not exist. Please make sure you copied your join link correctly.')
                                    }
                                } else {
                                    bootbox.alert('Success!');
                                }
                            });
                        } else {
                            command('joinsession',{
                                'name':prompt('Enter the name you want to display.'),
                                'id':params.get('id'),
                                'password':'',
                                'fingerprint':BrowserFingerprint
                            },API_PORT,function(data){
                                if (Object.keys(data).includes('code')) {
                                    if (data['code'] == 403) {
                                        bootbox.alert('Password is incorrect.');
                                        window.location = 'index.html';
                                    } else {
                                        bootbox.alert('That server does not exist. Please make sure you copied your join link correctly.')
                                    }
                                } else {
                                    bootbox.alert('Success!');
                                }
                            });
                        }
                    } else {
                        bootbox.alert('Cannot find that session.');
                    }
                });
            } else {
                console.log(data);
            }
        });
    }, 2000);
    // Button functions
    $('#save-session').click(function(){ // Save the current session to a file
        command('scmd',{
            'sid':params.get('id'),
            'fingerprint':BrowserFingerprint,
            'command':'save',
            'args':0
        },API_PORT,function(data){
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data['save']));
            saveAs(dataStr,'session.json');
        });
    });

    $('#share-link').click(function() { // Copying the share link
        var id = 'share-link';
        var el = document.getElementById(id);
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        $(this).attr('data-tooltip','Copied!');
        window.setTimeout(function(){$('#share-link').attr('data-tooltip','Click to Copy')},2000);
    });

    $('#submit-nick').click(function(){ // Change player nickname
        if ($('#change-nick-input').val() == '') {
            $('#change-nick-input').toggleClass('invalid',true);
            return;
        } else {
            $('#change-nick-input').toggleClass('invalid',false);
        }
        $('.active').toggleClass('active',false);
        $('.invalid').toggleClass('invalid',false);
        command('editname',{
            'sid':params.get('id'),
            'fingerprint':BrowserFingerprint,
            'name':$('#change-nick-input').val()
        },API_PORT,function(data){
            if (data['code'] == 404) {
                bootbox.alert('Error: '+data['reason']);
            }
        });
    });

    $('#settings-submit').click(function(){ // Finish modifying settings
        if ($('#session-name-set').val() == '') {
            $('#session-name-set').toggleClass('invalid',true);
            return;
        } else {
            $('#session-name-set').toggleClass('invalid',false);
        }
        $('.active').toggleClass('active',false);
        $('.invalid').toggleClass('invalid',false);
        command('modsession',{
            'sid':params.get('id'),
            'fingerprint':BrowserFingerprint,
            'newname':$('#session-name-set').val(),
            'newpass':$('#session-psw-set').val(),
            'settings':JSON.stringify({
                'rollLogging':$('#set_roll-logging input').prop('checked')
            })
        },API_PORT,function(data){
            if (data.code != 200) {
                bootbox.alert(data.reason);
            }
        });
    });
    $('#session-reset').click(function(){ // Purge all session info (maps & characters)
        if (confirm('Are you sure? This action is irreversible unless you have saved a copy of this session.')) {
            command('purge',{
                'sid':params.get('id'),
                'fingerprint':BrowserFingerprint
            },API_PORT,function(data){
                if (data.code != 200) {
                    bootbox.alert(data.reason);
                }
            })
        }
    });

    $('#set-sheet-input').keyup(function(){ // Update iframe to display sheet.
        $('#sheet-frame').attr('src',$('#set-sheet-input').val());
        if ($('#set-sheet-input').val().includes('spreadsheets')) {
            $('#sheet-frame').show(0);
        } else {
            $('#sheet-frame').hide(0);
        }
    });
    $('#submit-sheet').click(function(){ // Submit sheet
        if ($('#set-sheet-input').val() == '') {
            $('#set-sheet-input').toggleClass('invalid',true);
            return;
        } else {
            $('#set-sheet-input').toggleClass('invalid',false);
        }
        $('.active').toggleClass('active',false);
        $('.invalid').toggleClass('invalid',false);
        command('scmd',{
            'sid':params.get('id'),
            'fingerprint':BrowserFingerprint,
            'command':'load_sheet',
            'args':$('#set-sheet-input').val()
        },API_PORT,function(data){
            if (data['code'] == 200) {
                bootbox.alert('Sheet loaded.');
            } else {
                bootbox.alert('Error: '+data['reason']);
            }
        });
    });

    $('#submit-critterdb').click(function(){ // Submit sheet
        if ($('#critterdb-input').val() == '') {
            $('#critterdb-input').toggleClass('invalid',true);
            return;
        } else {
            $('#critterdb-input').toggleClass('invalid',false);
        }
        $('.active').toggleClass('active',false);
        $('.invalid').toggleClass('invalid',false);
        scmd(
            'load_homebrew',
            [$('#critterdb-input').val()],
            function(data){
                if (data.code == 200) {
                    bootbox.alert('Success! Loaded '+data.num_creatures+' creature(s) from '+$('#critterdb-input').val());
                }
                command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
            }
        )
    });

    // Loading maps
    $('#load-map').click(function(){$('#load-map-file').click()});
    $('#load-map-file').change(function(){
        var file = document.getElementById('load-map-file').files[0];
        var reader = new FileReader();
        reader.addEventListener("load", function () {
            if ($('#map-rows').val() == '') {
                var rows = 20;
            } else {
                var rows = $('#map-rows').val();
            }
            if ($('#map-cols').val() == '') {
                var cols = 20;
            } else {
                var cols = $('#map-cols').val();
            }
            if ($('#grid-size-inp').val() == '') {
                var gs = 5;
            } else {
                var gs = $('#grid-size-inp').val();
            }

            scmd('load_map',[reader.result,rows,cols,gs],refresh);
        }, false);
    
        if (file) {
            reader.readAsDataURL(file);
        }
    });

    // Set PC icon
    $('#set-icon').click(function(){$('#set-icon-file').click()});
    $('#set-icon-file').change(function(){
        var file = document.getElementById('set-icon-file').files[0];
        var reader = new FileReader();
        reader.addEventListener("load", function () {
            scmd(
                'modify_pc',
                [BrowserFingerprint,reader.result,[]],
                function(){
                    command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                }
            );
        }, false);
    
        if (file) {
            reader.readAsDataURL(file);
        }
    });

    // NPC Maker
    $('#npc-search').keyup(function(event){
        if ($('#npc-search').val().length > 0) {
            scmd('open5e',['monsters','search,'+$('#npc-search').val(),'limit,50'],function(data){
                if (data.code == 200) {
                    var initialParse = JSON.parse(data.result);
                    document.getElementById('search-results').innerHTML = '';
                    for (var n=0;n<initialParse.data.length;n++) {
                        var point = initialParse.data[n];
                        var name = point.name;
                        var type = point.type;
                        var hp = point.hit_points.toString();
                        var cr = point.challenge_rating;
                        if (Object.keys(point).includes('homebrew')) {
                            var _id = point.dbId;
                            $('<div class="npc-info-block homebrew-npc"><span>'+[
                                    'Name: <a href="https://critterdb.com/#/creature/view/'+_id+'" target="_blank">'+name+'</a>',
                                    'Type: '+type,
                                    'HP: '+hp,
                                    'CR: '+cr
                                ].join('</span><span>')+'</span></div>')
                                .append(
                                    $('<button class="rm-homebrew-npc" id="npc_'+_id+'" name="'+_id+'" data-tooltip="Delete Creature" data-tooltip-location="left"><img width="100%" height="100%" src="assets/delete.png"></button>')
                                    .click(function(event){
                                        var delId = $(event.delegateTarget).attr('name');
                                        scmd(
                                            'delete_homebrew',
                                            [delId],
                                            function(data){
                                                $('#npc-search').keyup();
                                            }
                                        );
                                    })
                                )
                                .attr('data',JSON.stringify(point))
                                .click(function(event){
                                    var data = JSON.parse($(event.delegateTarget).attr('data'));
                                    $('#npc-name-inp').val(data.name);
                                    $('#npc-hp-inp').val(data.hit_points);
                                    $('.npc-icon').removeClass('selected');
                                    if (data.img_main) {
                                        $('#npc-icon-open5e').toggleClass('selected',true);
                                        $('#npc-icon-open5e img').attr('src',data.img_main);
                                        $('#npc-icon-open5e').css('display','inline-block');
                                    } else if (data.type == 'dragon') {
                                        $('#npc-icon-Dragon').toggleClass('selected',true);
                                        $('#npc-icon-open5e').css('display','none');
                                    } else if (data.name.toLowerCase().includes('mimic')) {
                                        $('#npc-icon-Treasure').toggleClass('selected',true);
                                        $('#npc-icon-open5e').css('display','none');
                                    } else {
                                        $('#npc-icon-Dice').toggleClass('selected',true);
                                        $('#npc-icon-open5e').css('display','none');
                                    }
                                    npcData.data = data;
                                })
                                .appendTo($('#search-results'));
                        } else {
                            var slug = point.slug;
                            $('<div class="npc-info-block"><span>'+[
                                    'Name: <a href="https://open5e.com/monsters/'+slug+'" target="_blank">'+name+'</a>',
                                    'Type: '+type,
                                    'HP: '+hp,
                                    'CR: '+cr
                                ].join('</span><span>')+'</span></div>')
                                .attr('data',JSON.stringify(point))
                                .click(function(event){
                                    var data = JSON.parse($(event.delegateTarget).attr('data'));
                                    $('#npc-name-inp').val(data.name);
                                    $('#npc-hp-inp').val(data.hit_points);
                                    $('.npc-icon').removeClass('selected');
                                    if (data.img_main) {
                                        $('#npc-icon-open5e').toggleClass('selected',true);
                                        $('#npc-icon-open5e img').attr('src',data.img_main);
                                        $('#npc-icon-open5e').css('display','inline-block');
                                    } else if (data.type == 'dragon') {
                                        $('#npc-icon-Dragon').toggleClass('selected',true);
                                        $('#npc-icon-open5e').css('display','none');
                                    } else if (data.name.toLowerCase().includes('mimic')) {
                                        $('#npc-icon-Treasure').toggleClass('selected',true);
                                        $('#npc-icon-open5e').css('display','none');
                                    } else {
                                        $('#npc-icon-Dice').toggleClass('selected',true);
                                        $('#npc-icon-open5e').css('display','none');
                                    }
                                    npcData.data = data;
                                })
                                .appendTo($('#search-results'));
                        }
                    }
                }
            });
        }
    });
    $('.npc-icon').click(function(event){
        if (event.delegateTarget.id == 'npc-icon-upload') {
            $('#npc-icon-file').click();
        }
        $('.npc-icon').toggleClass('selected',false);
        $(event.delegateTarget).toggleClass('selected',true);
    });
    $('#npc-submit').click(function(event){
        $('#modal-back').click();
        npcData.data.name = $('#npc-name-inp').val();
        npcData.data.hit_points = Number($('#npc-hp-inp').val());
        npcData.makingNPC = false;

        if ($('.npc-icon.selected')[0].getAttribute('name') == 'open5e') {
            icon = $('.npc-icon.selected img')[0].getAttribute('src');
        } else if ($('.npc-icon.selected')[0].getAttribute('name') == 'upload' && $('#npc-icon-upload').attr('data') != "null") {
            icon = $('#npc-icon-upload img')[0].getAttribute('src');
        } else {
            icon = $('.npc-icon.selected')[0].getAttribute('name');
        }

        scmd('add_npc',[
            npcData.map,
            icon,
            JSON.stringify(npcData.data),
            npcData.pos[0],
            npcData.pos[1]
        ],console.log);
    });
    $('#npc-icon-file').change(function(){
        var file = document.getElementById('npc-icon-file').files[0];
        var reader = new FileReader();
        reader.addEventListener("load", function () {
            $('#npc-icon-upload').attr('data',reader.result);
            $('#npc-icon-upload img').attr('src',reader.result);
        }, false);
    
        if (file) {
            reader.readAsDataURL(file);
        }
    });

    // Map Buttons
    $('#remove-map').click(function(){
        scmd('delete_map',[$('#maps-area .selected').attr('id')],refresh);
        $('#map-actions').toggleClass('active',false);
    });
    $('#place-map').click(function(){
        var mapData = JSON.parse($('#maps-area .selected').attr('data'));
        scmd('modify_map',[
        $('#maps-area .selected').attr('id'),
        mapData.grid_data.rows,
        mapData.grid_data.columns,
        mapData.grid_data.size,true
        ],refresh);
        $('#map-actions').toggleClass('active',false);
    });
    $('#mod-map').click(function(){
        var mapData = JSON.parse($('#maps-area .selected').attr('data'));

        if ($('#map-rows').val() == '') {
            var rows = mapData.grid_data.rows;
        } else {
            var rows = $('#map-rows').val();
        }
        if ($('#map-cols').val() == '') {
            var cols = mapData.grid_data.columns;
        } else {
            var cols = $('#map-cols').val();
        }
        if ($('#grid-size-inp').val() == '') {
            var gs = mapData.grid_data.size;
        } else {
            var gs = $('#grid-size-inp').val();
        }

        scmd('modify_map',[
        $('#maps-area .selected').attr('id'),
        rows,
        cols,
        gs,
        mapData.active
        ],refresh);
        $('#map-actions').toggleClass('active',false);
    });

    $('#cursors-bar button').click(function(event){
        cursor = event.delegateTarget.getAttribute('name');
        
        console.log(event.delegateTarget);
        console.log(cursor);
        refresh();
    });

    // Refresh Loop
    window.setInterval(function(){
        command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
    },400);

    // Button Cosmetics
    $('#modal-back').click(function(){$('.active').toggleClass('active',false);$('.invalid').toggleClass('invalid',false);});
    $('#edit-name').click(function(){
        $('#modal-back').toggleClass('active',true);
        $('#change-name-dialog').toggleClass('active',true);
    });
    $('#update-sheet').click(function(){
        scmd(
            'update_sheet',
            ['0'],
            function(data){
                console.log(data);
                command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
            }
        );
    });
    $('#set-sheet').click(function(){
        $('#modal-back').toggleClass('active',true);
        $('#set-sheet-dialog').toggleClass('active',true);
        $('#set-sheet-input').val('');
        $('#sheet-frame').hide(0);
    });
    $('#load-critterdb').click(function(){
        $('#modal-back').toggleClass('active',true);
        $('#critterdb-dialog').toggleClass('active',true);
        $('#critterdb-input').val('');
        $('#critterdb-frame').hide(0);
    });
    $('#reload-critterdb').click(function(){
        scmd(
            'reload_homebrew',
            [0],
            function(data){
                bootbox.alert(data.msg);
                command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
            }
        );
    });
    $('#settings').click(function(){
        $('#modal-back').toggleClass('active',true);
        $('#session-name-set').val(previousData.name);
        $('#settings-menu').toggleClass('active',true);
    });
    $('#adv-init').click(function(){
        scmd(
            'initiative',
            ['next',$('#'+currentCtx).attr('mapId'),-1],
            console.log
        );
        scmd(
            'initiative',
            ['check',$('#'+currentCtx).attr('mapId'),$('#'+currentCtx).attr('id')],
            function(data){
                $('#ci-img').attr('src',getIcon(data.current.icon));
                $('#ni-img').attr('src',getIcon(data.next.icon));
                $('#current-init').attr('data-tooltip',data.current.name);
                $('#next-init').attr('data-tooltip',data.next.name);
                console.log(data);
            }
        );
    });
    $('#next-arrow').click(function(){
        scmd(
            'initiative',
            ['next',$('#'+currentCtx).attr('mapId'),-1],
            console.log
        );
        scmd(
            'initiative',
            ['check',$('#'+currentCtx).attr('mapId'),$('#'+currentCtx).attr('id')],
            function(data){
                $('#ci-img').attr('src',getIcon(data.current.icon));
                $('#ni-img').attr('src',getIcon(data.next.icon));
                $('#current-init').attr('data-tooltip',data.current.name);
                $('#next-init').attr('data-tooltip',data.next.name);
                console.log(data);
            }
        );
    });
    $('#adv-stop').click(function(){
        scmd(
            'initiative',
            ['end',$('#'+currentCtx).attr('mapId'),-1],
            function(data) {
                return;
            }
        );
    });
    $('#manage-maps').click(function(){
        $('#modal-back').toggleClass('active',true);
        $('#manage-maps-menu').toggleClass('active',true);
        $('#maps-area img').toggleClass('selected',false);
        refresh();
    });
    var diceList = {
        'd4':4,
        'd6':6,
        'd8':8,
        'd10':10,
        'd12':12,
        'd20':20,
        'd100':100
    };
    for (var d=0;d<Object.keys(diceList).length;d++) {
        $('#'+Object.keys(diceList)[d]+'-btn')
            .attr('dice',diceList[Object.keys(diceList)[d]])
            .attr('diceType',Object.keys(diceList)[d])
            .click(function(event){
                var value = getRandom(1,Number($(event.delegateTarget).attr('dice'))).toString();
                $('#roll-result').text(String(value));
                $('#dice-display').animate({'height':'45px'},200);
                clearTimeout(currentDiceHide);
                currentDiceHide = setTimeout(function(){$('#dice-display').animate({'height':'0px'},200);currentDiceHide=undefined;},5000);
                if (previousData.users[BrowserFingerprint].type == 'pc' && previousData.settings.rollLogging) {
                    scmd(
                        'sys_message',
                        [
                            'dm',
                            '<span class="bold">ROLL - SIMPLE ROLL:</span><br>User '
                                +previousData.users[BrowserFingerprint].name
                                +' rolled a '
                                +$(event.delegateTarget).attr('diceType')
                                +' and got '
                                +String(value)+'.'
                        ],
                        function(){
                            command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                        }
                        
                    );
                }
            });
    }

    $('#dcustom-btn').click(function(event){
        $('#dice-input').show(0);
        $('#dice-input').animate({'height':'45px','bottom':'35px'},200);
        $('#dice-input input').animate({'height':'32px'},200);
    });
    $('#dice-input').hide(0);
    $('#dice-input input').change(function(event){
        $('#dice-input').hide(0);
        $('#dice-input').animate({'height':'0px','bottom':'0px'},0);
        $('#dice-input input').animate({'height':'0px'},0);
        if ($('#dice-str-inp').val() != '') {
            scmd(
                'roll',
                [$('#dice-str-inp').val()],
                function(data) {
                    if (data.code == 200) {
                        bootbox.alert(
                            '<span class="bold">Result: </span><br>You rolled '
                            +$('#dice-str-inp').val()
                            +' and got '
                            +data.roll
                            +'.<br><br><span class="bold">Elements: </span><br>'
                            +data.elements.replace(/ \*\*/g,' <span class="bold">').replace(/\(\*\*/g,'(<span class="bold">').replace(/\*\*/g,'</span>')
                        );
                        if (previousData.users[BrowserFingerprint].type == 'pc' && previousData.settings.rollLogging) {
                            scmd(
                                'sys_message',
                                [
                                    'dm',
                                    '<span class="bold">ROLL - COMPLEX ROLL:</span><br>User '
                                        +previousData.users[BrowserFingerprint].name
                                        +' rolled '
                                        +$('#dice-str-inp').val()
                                        +' and got '
                                        +String(data.roll)+'.<br><br><span class="bold">Verbose Roll:</span><br>'
                                        +data.elements.replace(/ \*\*/g,' <span class="bold">').replace(/\(\*\*/g,'(<span class="bold">').replace(/\*\*/g,'</span>')
                                ],
                                function(){
                                    command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                                }
                                
                            );
                        }
                    } else {
                        bootbox.alert('<span class="bold">Error: </span><br>There was an error in your roll ('+$('#dice-str-inp').val()+'):<br><br>'+data.reason);
                    }
                    $('#dice-str-inp').val('');
                }
            );
        }
    });
    $('#send-msg').click(function(event){
        if ($('#new-msg-inp').val().length > 0) {
            scmd(
                'send_message',
                ['*',escapeHtml($('#new-msg-inp').val())],
                function(data){
                    command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                    $('#new-msg-inp').val('');
                }
            );
        }
    });
    $('#toggle-chat-btn').click(function(event){
        scmd(
            'read_messages',
            [0],
            function(data){
                command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
            }
        );
        messageActivating = true;
        setTimeout(function(){
            messageActivating = false;
        },0.5);
        $('#message-window').toggleClass('active');
    });
    $('#toggle-help-btn').click(function(event){
        command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
        $('#help-panel').toggleClass('active',true);
        $('#modal-back').toggleClass('active',true);
    });


    // Fit text areas
    //$('#top-text h3').fitText(1);
});