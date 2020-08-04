function refresh(data,override) { // Run this routine every .4s
    if (data == undefined) {
        data = {'code':200};
    }
    if (data.code == 404) {
        window.location = '/';
    }

    if ((JSON.stringify(data) != JSON.stringify(previousData) && data.code == 200)) {
        if (Object.keys(data).length <= 1) {
            data = previousData;
        }
        previousData = data;

        if (data.session.initiative.active) {
            $('#adv-init').show();
            $('#adv-stop').show();
            $('#initiative-box').show();
        } else {
            $('#adv-init').hide();
            $('#adv-stop').hide();
            $('#initiative-box').hide();
            currentInitiative = null;
        }

        scmd(
            'initiative',
            ['check',$('#'+currentCtx).attr('mapId'),$('#'+currentCtx).attr('id')],
            function(data){
                $('#ci-img').attr('src',getIcon(data.current.icon));
                $('#ni-img').attr('src',getIcon(data.next.icon));
                $('#current-init').attr('data-tooltip',data.current.name);
                $('#next-init').attr('data-tooltip',data.next.name);
                
            }
        );

        if (previousData.users[BrowserFingerprint].type == 'dm') {
            uType = 'dm';
            $('#player-buttons').css('display','none');
            $('#dm-buttons').css('display','block');
        } else {
            uType = 'pc';
            $('#dm-buttons').css('display','none');
            $('#player-buttons').css('display','block');
        }

        // Update player listing
        var elbox = document.getElementById('user-area');
        elbox.innerHTML = '';

        var keys = Object.keys(previousData.users);

        for (var k=0;k<keys.length;k++) {
            var newElement = document.createElement('div');
            newElement.id = 'user-'+previousData.users[keys[k]].fingerprint;
            newElement.innerText = previousData.users[keys[k]].name;
            newElement.className = 'noselect user-card'
            if (previousData.users[keys[k]].type == 'dm') {
                newElement.style = 'border-left: 4px solid rgb(255, 47, 10);';
            }
            if (!previousData.users[keys[k]].active) {
                $(newElement).addClass('user-inactive');
                $(newElement).css('color','rgb(150,150,150)');
                if (uType == 'dm') {
                    $(newElement).append($(
                        '<button data-tooltip="Delete User" data-tooltip-location="right" class="user-delete user-button" name="'+previousData.users[keys[k]].fingerprint+'" id="card_delete_'+previousData.users[keys[k]].fingerprint+'"><img src="assets/delete.png"></button>'
                    ).click(function(event){
                        scmd(
                            'delete_user',
                            [$(event.delegateTarget).attr('name')],
                            function (data) {
                                command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                            }
                        );
                    }));
                } else {
                    if (previousData.users[keys[k]].type == 'pc') {
                        $(newElement).append($(
                            '<button data-tooltip="Claim User" data-tooltip-location="right" class="user-claim user-button" name="'+previousData.users[keys[k]].fingerprint+'" id="card_claim_'+previousData.users[keys[k]].fingerprint+'"><img src="assets/avatar.png"></button>'
                        ).click(function(event){
                            scmd(
                                'assign_pc',
                                [$(event.delegateTarget).attr('name')],
                                function (data) {
                                    command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                                }
                            );
                        }));
                    }
                }

            }
            elbox.appendChild(newElement);
        }

        $('#session-name').text('Session Name: '+previousData.name);

        // Hide or show user-type specific elements
        if (uType == 'dm') {
            $('.player-only').hide();
        } else {
            $('.dm-only').hide();
        }

        // Load messages
        $('#message-box').html('');
        var newUnread = false;
        for (var msg=0;msg<previousData.users[BrowserFingerprint]['messages'].length;msg++) {
            $(
                '<div class="message"><div class=\'message-author bold\'>'
                +previousData.users[BrowserFingerprint]['messages'][msg]['source']
                +'</div><div class=\'message-content\'>'
                +previousData.users[BrowserFingerprint]['messages'][msg]['content']
                +'</div></div>'
            ).appendTo($('#message-box'));
            if (!previousData.users[BrowserFingerprint]['messages'][msg]['read'] && !$('#message-window').hasClass('active')) {
                newUnread = true;
            }
        }
        $('#notify-num').toggleClass('active',newUnread);

        // Set settings switches to current values
        if (whatIsIt(previousData.settings) == "string") {
            var settings = JSON.parse(previousData.settings);
        } else {
            var settings = previousData.settings;
        }
        $('#set_roll-logging input').prop('checked',settings.rollLogging);

        // Populate help pages
        $('#help-sections').html('');
        var helpPages = JSON.parse(previousData.help_pages);
        for (var s=0;s<Object.keys(helpPages).length;s++) {
            var helpSectionEl = $('<div class="help-section" id="section-'+Object.keys(helpPages)[s]+'"><div class="section-title">'+Object.keys(helpPages)[s]+'</div></div>');
            var section = helpPages[Object.keys(helpPages)[s]];
            for (var p=0;p<Object.keys(section).length;p++) {
                var buttonTitle = Object.keys(section)[p];

                $(helpSectionEl).append(
                    $('<button class="help-page-btn" id="page-btn-'+Object.keys(section)[p]+'" name="'+section[Object.keys(section)[p]]+'">'+buttonTitle+'</button>')
                    .click(function(event){
                        $('#help-display').attr('src','docs_html/'+$(event.delegateTarget).attr('name'));
                        $('#help-title').text($(event.delegateTarget).text());
                    })
                );
            }
            $('#help-sections').append(helpSectionEl);
        }

        // Load maps
        var mapArea = document.getElementById('maps-area');
        mapArea.innerHTML = '';
        var displayArea = document.getElementById('display-area');
        displayArea.innerHTML = '';
        for (var m=0;m<previousData.session.maps.length;m++) {
            var el = document.createElement('img');
            el.src = previousData.session.maps[m].image;
            el.title = 'Dimensions: '.concat(
                previousData.session.maps[m].grid_data.columns.toString(),
                ' x ',
                previousData.session.maps[m].grid_data.rows.toString(),
                ' | Grid Size: ',
                previousData.session.maps[m].grid_data.size.toString(),
                ' ft.'
            );
            el.id = previousData.session.maps[m].id;
            if (!Object.keys(localMapData).includes(el.id)) {
                localMapData[el.id] = {
                    'zoom':1.0,
                    'pos':[0,0]
                };
            }
            el.setAttribute('data',JSON.stringify(previousData.session.maps[m]));
            el.onclick = doMapImageClick;
            mapArea.appendChild(el);

            if (previousData.session.maps[m].active == 'true') {
                var container = document.createElement('div');
                
                container.className = 'map-container noselect';
                container.id = previousData.session.maps[m].id;
                $(container).css({
                    'width':(50*Number(previousData.session.maps[m].grid_data.columns*localMapData[container.id].zoom)).toString()+'px',
                    'height':(50*Number(previousData.session.maps[m].grid_data.rows*localMapData[container.id].zoom)).toString()+'px',
                    'top':localMapData[container.id].pos[1].toString() + 'px',
                    'left':localMapData[container.id].pos[0].toString() + 'px',
                    'cursor':cursor
                });

                // Obscure functions
                $(container).mousedown(function(event){ // Start obscuring
                    if (cursor != 'crosshair') {
                        return;
                    }
                    var target = event.delegateTarget;
                    if (event.target.className == 'obscure') {
                        return;
                    }
                    
                    obscureInfo.id = target.id;
                    var pos = convertMouseToMapPos(target.id,event.pageX,event.pageY);
                    obscureInfo.sx = pos[0];
                    obscureInfo.sy = pos[1];
                    obscureInfo.pageXS = event.pageX;
                    obscureInfo.pageYS = event.pageY;
                    obscureInfo.obscuring = true;
                    console.log(obscureInfo);
                    $('#selection-box').css({
                        top:'0px',
                        left:'0px',
                        width:'0px',
                        height:'0px'
                    });
                    $('#selection-box').css('display','inline-block');
                    
                });
                $(container).mousemove(function(event){ // Show obscure selection
                    var target = event.delegateTarget;
                    if (obscureInfo.obscuring && (obscureInfo.id == target.id || target.id == 'selection-box')) {
                        if (event.pageX >= obscureInfo.pageXS) {
                            var left = obscureInfo.pageXS;
                            var width = event.pageX - left;
                        } else {
                            var left = event.pageX;
                            var width = obscureInfo.pageXS - left;
                        }

                        if (event.pageY >= obscureInfo.pageYS) {
                            var top = obscureInfo.pageYS;
                            var height = event.pageY - top;
                        } else {
                            var top = event.pageY;
                            var height = obscureInfo.pageYS - top;
                        }

                        $('#selection-box').css({
                            top:(top-2).toString()+'px',
                            left:(left-2).toString()+'px',
                            width:width.toString()+'px',
                            height:height.toString()+'px'
                        });
                    }
                });
                $(container).mouseup(function(event){ // Obscure finish
                    if (cursor != 'crosshair') {
                        return;
                    }
                    var target = event.delegateTarget;
                    var data = JSON.parse($(target).attr('data'));
                    if (obscureInfo.obscuring && (obscureInfo.id == target.id || target.id == 'selection-box')) {
                        var newpos = convertMouseToMapPos(target.id,event.pageX,event.pageY);
                        if (newpos[0] >= obscureInfo.sx) {
                            obscureInfo.w = newpos[0]-obscureInfo.sx;
                        } else {
                            obscureInfo.w = obscureInfo.sx-newpos[0];
                            obscureInfo.sx = newpos[0];
                        }
                        
                        if (newpos[1] >= obscureInfo.sy) {
                            obscureInfo.h = newpos[1]-obscureInfo.sy;
                        } else {
                            obscureInfo.h = obscureInfo.sy-newpos[1];
                            obscureInfo.sy = newpos[1];
                        }
                        obscureInfo.obscuring = false;
                        var zoomMod = Number(target.getAttribute('zoom'));
                        var args = [
                            target.id,
                            Math.round((obscureInfo.sx/(Number(data.grid_data.columns)*10))*20)/5,
                            Math.round((obscureInfo.sy/(Number(data.grid_data.rows)*10))*20)/5,
                            (obscureInfo.w/(Number(data.grid_data.columns)*50))*100,
                            (obscureInfo.h/(Number(data.grid_data.rows)*50))*100,
                            sha256(Math.random().toString())
                        ];
                        if (args[3] < 1 && args[4] < 1) {
                            return;
                        }

                        scmd('obscure',args,function(data){
                            $('#selection-box').css('display','none');
                        });
                        
                    }
                });

                $('#display-area').mousemove(function(event){
                    if (obscureInfo.obscuring && event.target.id == 'display-area') {
                        $('#selection-box').css('display','none');
                        obscureInfo.obscuring = false;
                    }
                });


                container.setAttribute('zoom',localMapData[container.id].zoom.toString());
                container.setAttribute('data',JSON.stringify(previousData.session.maps[m]));
                var localContainer = document.createElement('div');
                $(localContainer).css('position','relative');
                localContainer.className = 'map-local';
                var mapImage = document.createElement('img');
                mapImage.src = previousData.session.maps[m].image;
                $(mapImage).contextmenu(function(event){
                    event.preventDefault();
                    $(event.target.parentElement.parentElement).trigger('contextmenu',[event.pageX,event.pageY]);
                });
                $(mapImage).css({
                    'width':'100%',
                    'height':'100%'
                });
                mapImage.setAttribute('draggable',false);

                localContainer.appendChild(mapImage);

                // Draw obscuration rects

                for (var o=0;o<Object.keys(previousData.session.maps[m].obscuration).length;o++) {
                    var oid = Object.keys(previousData.session.maps[m].obscuration)[o];
                    var info = previousData.session.maps[m].obscuration[oid];

                    var obElement = document.createElement('div');
                    obElement.className = 'obscure';
                    obElement.setAttribute('mapid',container.id);
                    $(obElement).css({
                        'left':(info[0]*5).toString()+'%',
                        'top':(info[1]*5).toString()+'%',
                        'width':(info[2]).toString()+'%',
                        'height':(info[3]).toString()+'%',
                        'background-color':'rgb(0,0,0)',
                        'position':'absolute',
                        'z-index':'101'
                    });
                    obElement.id = oid;
                    $(obElement).click(function(event){
                        if (cursor =='crosshair') {
                            scmd('remove_obscure',[event.delegateTarget.getAttribute('mapid'),event.delegateTarget.id],refresh);
                        }
                    });
                    localContainer.appendChild(obElement);
                }

                // Add active characters to the map
                for (var c=0;c<Object.keys(previousData.session.maps[m].characters).length;c++) {
                    var key = Object.keys(previousData.session.maps[m].characters)[c];
                    var id = Object.keys(previousData.session.maps[m].characters)[c];
                    var name = previousData.session.maps[m].characters[key].name;
                    var position = previousData.session.maps[m].characters[key].pos;
                    var icon = previousData.session.maps[m].characters[key].icon;
                    var data = previousData.session.characters[key];
                    if (!icon.includes('data')) {
                        icon = 'assets/icons/'+iconIndex[icon];
                    }

                    var pcElement = document.createElement('div');
                    pcElement.id = id;
                    pcElement.setAttribute('mapId',container.id);
                    pcElement.title = 'Name: '+name+' | HP: '+data.hp+'/'+data.max_hp+' | AC: '+data.ac;
                    pcElement.className = 'pc-icon';
                    var pcImg = document.createElement('img');
                    pcImg.src = icon;
                    $(pcImg).on('contextmenu',function(event){
                        event.preventDefault();
                        $(event.target.parentElement).trigger('contextmenu',[event.pageX,event.pageY]);
                    });
                    pcElement.appendChild(pcImg);
                    $(pcElement).css({
                        top:((Number(position[1])/Number(previousData.session.maps[m].grid_data['rows']))*100).toString()+'%',
                        left:((Number(position[0])/Number(previousData.session.maps[m].grid_data['columns']))*100).toString()+'%',
                        width:(((5/Number(previousData.session.maps[m].grid_data.size))/Number(previousData.session.maps[m].grid_data['columns']))*100).toString()+'%',
                        height:(((5/Number(previousData.session.maps[m].grid_data.size))/Number(previousData.session.maps[m].grid_data['rows']))*100).toString()+'%',
                        position:'absolute'
                    });

                    localContainer.appendChild(pcElement);

                    // Drag & Drop
                    if (cursor == 'move' && uType == 'pc') {
                        $(pcElement).draggable({
                            'disabled':false,
                            //'grid':[50*localMapData[container.id].zoom,50*localMapData[container.id].zoom],
                            'containment':'parent'
                        });
                    } else {
                        $(pcElement).draggable({
                            'disabled':true
                        });
                    }
                    $(pcElement).on('dragstop',function(event){
                        var rect = event.target.getBoundingClientRect();
                        var pos = convertMouseToMapPos($(event.target).attr('mapId'),rect.left,rect.top);
                        var args = [
                            $(event.target).attr('mapId'),
                            Math.round(pos[0]/50),
                            Math.round(pos[1]/50)
                        ];
                        console.log(args);
                        scmd(
                            'move_pc',
                            args,
                            function(data){
                                if (data.code == 200) {
                                    command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                                }
                            }
                        );
                    });                                
                }

                // Add active NPCs to the map
                for (var c=0;c<Object.keys(previousData.session.maps[m].npcs).length;c++) {
                    var key = Object.keys(previousData.session.maps[m].npcs)[c];
                    var id = Object.keys(previousData.session.maps[m].npcs)[c];
                    console.log(previousData.session.maps[m].npcs[key]);
                    if (typeof(previousData.session.maps[m].npcs[key].data) == "string") {
                        var data = JSON.parse(previousData.session.maps[m].npcs[key].data);
                    } else {
                        var data = previousData.session.maps[m].npcs[key].data;
                    }
                    
                    var name = data.name;
                    var position = previousData.session.maps[m].npcs[key].pos;
                    var icon = previousData.session.maps[m].npcs[key].icon;
                    var size = data.size;
                    if (!icon.includes('data') && !icon.includes('/')) {
                        icon = 'assets/icons/'+iconIndex[icon];
                    }
                    console.log(icon);
                    var npcElement = document.createElement('div');
                    npcElement.id = id;
                    npcElement.setAttribute('mapId',container.id);
                    if (uType == 'dm') {
                        npcElement.title = 'Name: '+name+' | HP: '+previousData.session.maps[m].npcs[key].hp+'/'+data.hit_points+' | AC: '+data.armor_class;
                    } else {
                        npcElement.title = name;
                    }
                    
                    npcElement.className = 'npc-icon';
                    npcElement.setAttribute('data',JSON.stringify(data));
                    npcElement.setAttribute('current-hp',previousData.session.maps[m].npcs[key].hp);
                    var npcImg = document.createElement('img');
                    npcImg.src = icon;
                    $(npcImg).css({
                        'width':'80%',
                        'height':'80%',
                        'margin-left':'10%',
                        'margin-top':'10%'
                    });
                    $(npcImg).on('contextmenu',function(event){
                        event.preventDefault();
                        $(event.target.parentElement).trigger('contextmenu',[event.pageX,event.pageY]);
                    });
                    npcElement.appendChild(npcImg);
                    $(npcElement).css({
                        top:((Number(position[1])/Number(previousData.session.maps[m].grid_data['rows']))*100).toString()+'%',
                        left:((Number(position[0])/Number(previousData.session.maps[m].grid_data['columns']))*100).toString()+'%',
                        width:(((sizes[size]/Number(previousData.session.maps[m].grid_data.size))/Number(previousData.session.maps[m].grid_data['columns']))*100).toString()+'%',
                        height:(((sizes[size]/Number(previousData.session.maps[m].grid_data.size))/Number(previousData.session.maps[m].grid_data['rows']))*100).toString()+'%',
                        position:'absolute'
                    });

                    localContainer.appendChild(npcElement);

                    // Drag & Drop
                    if (cursor == 'move' && uType == 'dm') {
                        $(npcElement).draggable({
                            'disabled':false,
                            //'grid':[50*localMapData[container.id].zoom,50*localMapData[container.id].zoom],
                            'containment':'parent'
                        });
                    } else {
                        $(npcElement).draggable({
                            'disabled':true
                        });
                    }
                    $(npcElement).on('dragstop',function(event){
                        var rect = event.target.getBoundingClientRect();
                        var pos = convertMouseToMapPos($(event.target).attr('mapId'),rect.left,rect.top);
                        var args = [
                            $(event.target).attr('mapId'),
                            $(event.target).attr('id'),
                            $(event.target).attr('data'),
                            $(event.target).attr('current-hp'),
                            Math.round(pos[0]/50),
                            Math.round(pos[1]/50)
                        ];
                        if (args[4] < 0) {
                            args[4] = Math.abs(args[4]);
                        }
                        if (args[5] < 0) {
                            args[5] = Math.abs(args[5]);
                        }
                        scmd(
                            'modify_npc',
                            args,
                            function(data){
                                if (data.code == 200) {
                                    command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                                }
                            }
                        );
                    });                           
                }
                
                displayArea.appendChild(container);

                // Drag & Drop code from JQuery UI
                container.appendChild(localContainer);
                if (cursor == 'move') {
                    $(container).draggable({
                        'disabled':false
                    }).appendTo(container).css('position','absolute');
                } else {
                    $(container).draggable({
                        'disabled':true
                    }).appendTo(container).css('position','absolute');
                }
                $(container).on('dragstop',function(event){
                    if (event.target.classList.contains('pc-icon')||event.target.classList.contains('npc-icon')) {
                        return;
                    }
                    var rect = event.target.getBoundingClientRect();
                    var position = [
                        Math.round(rect.left-(window.innerWidth*0.05)).toString(), //-(window.innerWidth*0.05)
                        Math.round(rect.top-(window.innerHeight*0.05)).toString() //-(window.innerHeight*0.05)
                    ];
                    $(event.delegateTarget).css({
                        'top':position[1]+'px',
                        'left':position[0]+'px',
                        'postion':'absolute'
                    });
                    localMapData[event.delegateTarget.id].pos = position;
                    console.log(position);
                });

                $(container).on('wheel',function(event){
                    var topContainer = event.delegateTarget;
                    var Dy = event.originalEvent.deltaY;
                    var zoomMod = Number(topContainer.getAttribute('zoom'));
                    if (Dy < 0) {
                        zoomMod += 0.05;
                        var zoomDelta = 1.05;
                    } else if (Dy > 0) {
                        zoomMod -= 0.05;
                        var zoomDelta = 0.95;
                    }
                    
                    topContainer.setAttribute('zoom',limit(zoomMod,0.1,2).toString());
                    localMapData[topContainer.id].zoom = limit(zoomMod,0.1,5);
                    var dispArea = document.getElementById('display-area');
                    var dispRect = dispArea.getBoundingClientRect();
                    var topContainerRect = topContainer.getBoundingClientRect();
                    topContainerRect.x = localMapData[topContainer.id].pos[0];
                    topContainerRect.y = localMapData[topContainer.id].pos[1];

                    var originDelta = [
                        (event.pageX - dispRect.x - topContainerRect.x),
                        (event.pageY - dispRect.y - topContainerRect.y)
                    ];
                    localMapData[topContainer.id].pos = [(event.pageX-dispRect.x) - originDelta[0]*zoomDelta,(event.pageY-dispRect.y) - originDelta[1]*zoomDelta];
                    //localMapData[topContainer.id].pos = newpos;
                    var cid = null;
                    for (var i=0;i<previousData.session.maps.length;i++) {
                        if (previousData.session.maps[i].id==topContainer.id) {
                            cid = i;
                        }
                    }

                    $(topContainer).css({
                        'width':(50*Number(previousData.session.maps[cid].grid_data.columns*localMapData[topContainer.id].zoom)).toString()+'px',
                        'height':(50*Number(previousData.session.maps[cid].grid_data.rows*localMapData[topContainer.id].zoom)).toString()+'px',
                        'top':localMapData[topContainer.id].pos[1].toString() + 'px',
                        'left':localMapData[topContainer.id].pos[0].toString() + 'px',
                        'cursor':cursor,
                        'position':'absolute'
                    });


                });

                
            }
        }
    }
}