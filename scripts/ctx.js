$(document).ready(function(){
    // Context menu manager

    $(document).contextmenu(function(event,x,y){
        var keys = Object.keys(ctxMenu);
        for (var s=0;s<keys.length;s++){
            var type = keys[s].charAt(0);
            var name = keys[s].slice(1);
            var sel = keys[s];
            var found = false;
            if (type == '#') {
                if (event.target.id == name) {
                    found = true;
                    break;
                }
            }
            if (type == '.') {
                if ($(event.target).hasClass(name)) {
                    found = true
                    break;
                }
            }
        }
        if (found) {
            currentCtx = event.target.id;
            if (event.clientX == undefined) {
                var cx = x;
                var cy = y;
            } else {
                var cx = event.clientX;
                var cy = event.clientY;
            }
            $('#custom-ctx').css({
                top:cy+'px',
                left:cx.toString()+'px'
            });

            var children = $('#custom-ctx').children('*');
            var ct = 0;
            for (var c=0; c<children.length; c++) {
                if (Object.keys(ctxMenu[sel]).includes($(children[c]).attr('ctx'))) {
                    if (ctxMenu[sel][$(children[c]).attr('ctx')].includes('|')) {
                        var allowedUsers = ctxMenu[sel][$(children[c]).attr('ctx')].split('|')[0];
                        var ctxModifiers = ctxMenu[sel][$(children[c]).attr('ctx')].split('|')[1];
                    } else {
                        var allowedUsers = ctxMenu[sel][$(children[c]).attr('ctx')];
                        var ctxModifiers = '';
                    }
                    if (allowedUsers.split(',').includes(uType)) {
                        var checked = true;
                        var res = true;
                        if (ctxModifiers.split(',').includes('self') && uType == 'pc' ) {
                            if (currentCtx != BrowserFingerprint) {
                                res = false;
                            }
                        } 
                        if (ctxModifiers.split(',').includes('!self') && uType == 'pc' && res) {
                            if (!(currentCtx != BrowserFingerprint && $('#'+currentCtx).hasClass('pc-icon'))) {
                                res = false;
                            }
                        }
                        if (ctxModifiers.split(',').includes('init') && res) {
                            if (previousData.session.initiative.active) {
                                if (uType == 'pc') {
                                    if (previousData.session.initiative.order[previousData.session.initiative.rolls[previousData.session.initiative.index]].id != BrowserFingerprint) {
                                        res = false
                                    }
                                } else {
                                    if (previousData.session.initiative.order[previousData.session.initiative.rolls[previousData.session.initiative.index]].type != 'dm') {
                                        res = false;
                                    }
                                }
                            } else {
                                res = false;
                            }
                        }
                        if (ctxModifiers.split(',').includes('!init') && res) {
                            if (!previousData.session.initiative.active) {
                                if (ctxModifiers.split(',').includes('self') && uType == 'pc' ) {
                                    if (currentCtx != BrowserFingerprint) {
                                        res = false;
                                    }
                                }
                            } else {
                                if (uType == 'pc') {
                                    if (previousData.session.initiative.order[previousData.session.initiative.rolls[previousData.session.initiative.index]].id == BrowserFingerprint) {
                                        res = false;
                                    }
                                } else {
                                    if (previousData.session.initiative.order[previousData.session.initiative.rolls[previousData.session.initiative.index]].type == 'dm') {
                                        res = false;
                                    }
                                }
                            }
                        }
                        if (ctxModifiers.split(',').includes('in_init') && res) {
                            if (previousData.session.initiative.active) {
                                if (uType == 'pc') {
                                    var found = false;
                                    for (var e=0;e<previousData.session.initiative.rolls.length;e++) {
                                        if (previousData.session.initiative.order[previousData.session.initiative.rolls[e]].id == BrowserFingerprint) {
                                            found = true;
                                        }
                                    }
                                    if (!found) {
                                        res = false;
                                    }
                                } else {
                                    var found = false;
                                    for (var e=0;e<previousData.session.initiative.rolls.length;e++) {
                                        if (previousData.session.initiative.order[previousData.session.initiative.rolls[e]].id == currentCtx) {
                                            found = true;
                                        }
                                    }
                                    if (!found) {
                                        res = false;
                                    }
                                }
                            } else {
                                res = false;
                            }
                        }
                        if (ctxModifiers.split(',').includes('!in_init') && res) {
                            if (previousData.session.initiative.active) {
                                if (uType == 'pc') {
                                    var found = false;
                                    for (var e=0;e<previousData.session.initiative.rolls.length;e++) {
                                        if (previousData.session.initiative.order[previousData.session.initiative.rolls[e]].id == BrowserFingerprint) {
                                            found = true;
                                        }
                                    }
                                    if (found) {
                                        res = false;
                                    }
                                } else {
                                    var found = false;
                                    for (var e=0;e<previousData.session.initiative.rolls.length;e++) {
                                        if (previousData.session.initiative.order[previousData.session.initiative.rolls[e]].id == currentCtx) {
                                            found = true;
                                        }
                                    }
                                    if (found) {
                                        res = false;
                                    }
                                }
                            }
                        }
                        if (ctxModifiers.split(',').includes('target_init') && res) {
                            if (previousData.session.initiative.active) {
                                if (previousData.session.initiative.order[previousData.session.initiative.rolls[previousData.session.initiative.index]].id != currentCtx) {
                                    res = false
                                }
                            } else {
                                res = false;
                            }
                        }
                        if (ctxModifiers.split(',').includes('!target_init') && res) {
                            if (previousData.session.initiative.active) {
                                if (previousData.session.initiative.order[previousData.session.initiative.rolls[previousData.session.initiative.index]].id == currentCtx) {
                                    res = false
                                }
                            }
                        }
                        
                        $(children[c]).toggleClass('active',res);
                        if (res) {
                            ct++;
                        }
                    } else { $(children[c]).toggleClass('active',false); }
                } else { $(children[c]).toggleClass('active',false); }
            }
            if (ct > 0) {
                $('#custom-ctx').toggleClass('active',true);
            }
            event.preventDefault();
        }
    });
    $(document).click(function(event){
        if (event.target == undefined) {
            $('#custom-ctx').toggleClass('active',false);
            $('#custom-ctx *').toggleClass('active',false);
            currentCtx = null;
        }
        if ($(event.target).attr('id')!='custom-ctx') {
            $('#custom-ctx').toggleClass('active',false);
            $('#custom-ctx *').toggleClass('active',false);
            currentCtx = null;
        }
        if ($(event.target).parents('#initiative-sidebar').length == 0 && $(event.target).attr('id')!='initiative-sidebar' && !sidebarActivating) {
            $('#initiative-sidebar').toggleClass('active',false);
        }
        if ($(event.target).parents('#message-window').length == 0 && $(event.target).attr('id')!='message-window' && !messageActivating) {
            $('#message-window').toggleClass('active',false);
        }
        
    });
    // Context menu actions
    $('#ctx_map-close').click(function(event){
        var mapData = JSON.parse($('#'+currentCtx).attr('data'));
        scmd('modify_map',[
        $('#'+currentCtx).attr('id'),
        mapData.grid_data.rows,
        mapData.grid_data.columns,
        mapData.grid_data.size,false
        ],refresh);
        $(document).click();
    });
    $('#ctx_add-pc').click(function(event){
        var pos = convertMouseToMapPos(currentCtx,event.pageX,event.pageY);
        var args = [
            currentCtx,
            previousData.session.character_icons[BrowserFingerprint],
            roundTo(pos[0],50)/50,
            roundTo(pos[1],50)/50
        ];
        scmd(
            'activate_pc',
            args,
            console.log
        );
        $(document).click();
    });
    $('#ctx_remove-pc').click(function(event){
        scmd(
            'deactivate_pc',
            [$('#'+currentCtx).attr('mapId')],
            console.log
        );
        $(document).click();
    });
    $('#ctx_remove-pc-dm').click(function(event){
        console.log(currentCtx);
        scmd(
            'deactivate_pc_dm',
            [$('#'+currentCtx).attr('mapId'),currentCtx],
            console.log
        );
        $(document).click();
    });
    $('#ctx_add-npc').click(function(event){
        var _pos = convertMouseToMapPos(currentCtx,event.pageX,event.pageY);
        var pos = [roundTo(_pos[0],50)/50,roundTo(_pos[1],50)/50];
        npcData.makingNPC = true;
        npcData.pos = pos;
        npcData.map = currentCtx;
        $('#npc-menu input').val('');
        $('#npc-menu').toggleClass('active',true);
        $('#modal-back').toggleClass('active',true);
        $(document).click();
    });
    $('#ctx_remove-npc').click(function(event){
        scmd(
            'remove_npc',
            [$('#'+currentCtx).attr('mapId'),$('#'+currentCtx).attr('id')],
            console.log
        );
        $(document).click();
    });
    
    $('#ctx_run-initiative').click(function(event){
        if ($('#'+currentCtx).hasClass('npc-icon')) {
            scmd(
                'initiative',
                ['roll',$('#'+currentCtx).attr('mapId'),$('#'+currentCtx).attr('id')],
                console.log
            );
        } else {
            scmd(
                'initiative',
                ['roll',$('#'+currentCtx).attr('mapId'),-1],
                console.log
            );
        }
        $(document).click();
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
    });
    $('#ctx_remove-initiative').click(function(event){
        if ($('#'+currentCtx).hasClass('npc-icon')) {
            scmd(
                'initiative',
                ['remove',$('#'+currentCtx).attr('mapId'),$('#'+currentCtx).attr('id')],
                console.log
            );
        } else {
            scmd(
                'initiative',
                ['remove',$('#'+currentCtx).attr('mapId'),-1],
                console.log
            );
        }
        $(document).click();
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
    });
    $('#ctx_set-pc-hp').click(function(event){
        var new_hp = Number(prompt('Enter new HP amount.'));
        if (isNaN(new_hp)) {
            bootbox.alert('Please enter a number.');
            return;
        }
        if (new_hp <= previousData.session.characters[currentCtx].max_hp && new_hp >= 0) {
            scmd(
                'modify_pc',
                [currentCtx,-1,[['hp',new_hp]]],
                function(){
                    command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                }
            );
        } else {
            bootbox.alert('The new HP value must be between 0 and '+previousData.session.characters[currentCtx].max_hp);
        }
    });
    $('#ctx_set-pc-max-hp').click(function(event){
        var new_hp = Number(prompt('Enter new Max HP amount.'));
        if (isNaN(new_hp)) {
            bootbox.alert('Please enter a number.');
            return;
        }
        if (new_hp >= 0) {
            if (new_hp < previousData.session.characters[currentCtx].hp) {
                scmd(
                    'modify_pc',
                    [currentCtx,-1,[['hp',new_hp],['max_hp',new_hp]]],
                    function(){
                        command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                    }
                );
            } else {
                scmd(
                    'modify_pc',
                    [currentCtx,-1,[['max_hp',new_hp]]],
                    function(){
                        command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                    }
                );
            }
        } else {
            bootbox.alert('The new HP value must be greater than 0.');
        }
    });
    $('#ctx_change-pc-hp').click(function(event){
        var change = Number(prompt('Enter HP change (positive or negative).'));
        if (isNaN(change)) {
            bootbox.alert('Please enter a number.');
            return;
        }
        var new_hp = previousData.session.characters[currentCtx].hp + change;
        if (new_hp > previousData.session.characters[currentCtx].max_hp) {
            new_hp = previousData.session.characters[currentCtx].max_hp;
        } else if (new_hp < 0) {
            new_hp = 0;
        }
        scmd(
            'modify_pc',
            [currentCtx,-1,[['hp',new_hp]]],
            function(){
                command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
            }
        );
    });
    $('#ctx_edit-pc').click(function(event){
        $('#pc-editor').attr('editing',currentCtx);
        $('#hp-input').val(previousData.session.characters[currentCtx].hp);
        $('#max-hp-input').val(previousData.session.characters[currentCtx].max_hp);
        $('#ac-input').val(previousData.session.characters[currentCtx].ac);
        $('#init-input').val(previousData.session.characters[currentCtx].skills.initiative.value);
        for (var s=0;s<SCORES.length;s++) {
            $('#'+SCORES[s][0]+'-score-input').val(previousData.session.characters[currentCtx].stats[SCORES[s][1]]);
            var mod = getmod(previousData.session.characters[currentCtx].stats[SCORES[s][1]]);
            if (mod > 0) {
                mod = '+'+mod;
            }
            $('#'+SCORES[s][0]+'-bonus .value').text(mod);
            var mod = getmod(previousData.session.characters[currentCtx].stats[SCORES[s][1]]);
            if (previousData.session.characters[currentCtx].saves[SCORES[s][1]+'Save'].prof == 1) {
                mod = mod + previousData.session.characters[currentCtx].stats.prof_bonus;
            }
            if (mod > 0) {
                mod = '+'+mod;
            }
            $('#'+SCORES[s][0]+'-save .value').text(mod);
        }

        for (var s=0;s<SKILLS.length;s++) {
            var mod = previousData.session.characters[currentCtx].skills[SKILLS[s]].value;
            if (mod > 0) {
                mod = '+'+mod;
            }
            $('#'+SKILLS[s]+'-skill').text(mod);
        }

        $('#modal-back').toggleClass('active',true);
        $('#pc-editor').toggleClass('active',true);
    });
    $('#pc-editor input').change(function(event){
        var editing = $('#pc-editor').attr('editing');
        if (/^\d+$/.test($(event.target).val())) {
            var val = Number($(event.target).val());
            if (val < Number(event.target.min)) {
                val = Number(event.target.min);
            }
            if (val > Number(event.target.max)) {
                val = Number(event.target.max);
            }
            var key = $(event.target).attr('key');
            console.log(key,val);
            scmd(
                'modify_pc',
                [editing,-1,[[key,val]]],
                function(){
                    command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,function(data){
                        refresh(data);
                        var editing = $('#pc-editor').attr('editing');
                        $('#hp-input').val(data.session.characters[editing].hp);
                        $('#max-hp-input').val(data.session.characters[editing].max_hp);
                        $('#ac-input').val(data.session.characters[editing].ac);
                        $('#init-input').val(data.session.characters[editing].skills.initiative.value);
                        for (var s=0;s<SCORES.length;s++) {
                            $('#'+SCORES[s][0]+'-score-input').val(data.session.characters[editing].stats[SCORES[s][1]]);
                            var mod = getmod(data.session.characters[editing].stats[SCORES[s][1]]);
                            if (mod > 0) {
                                mod = '+'+mod;
                            }
                            $('#'+SCORES[s][0]+'-bonus .value').text(mod);
                            var mod = getmod(data.session.characters[editing].stats[SCORES[s][1]]);
                            if (data.session.characters[editing].saves[SCORES[s][1]+'Save'].prof == 1) {
                                mod = mod + data.session.characters[editing].stats.prof_bonus;
                            }
                            if (mod > 0) {
                                mod = '+'+mod;
                            }
                            $('#'+SCORES[s][0]+'-save .value').text(mod);
                        }

                        for (var s=0;s<SKILLS.length;s++) {
                            var mod = data.session.characters[editing].skills[SKILLS[s]].value;
                            if (mod > 0) {
                                mod = '+'+mod;
                            }
                            $('#'+SKILLS[s]+'-skill').text(mod);
                        }
                    });
                }
            );
        } else {
            $(event.target).val('');
        }
    });
    $('#ctx_claim-pc').click(function(event){
        scmd(
            'assign_pc',
            [currentCtx],
            function(){
                command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
            }
        );
    });
    $('#ctx_attack').click(function(event){
        currentInitTarget = currentCtx;

        var userAttacks = previousData.session.characters[BrowserFingerprint].attacks;
        $('#actions-panel').html('');
        for (var a=0;a<userAttacks.length;a++) {
            var atk = userAttacks[a];
            var atkDesc = atk.automation[1][atk.automation[1].type]
                .replace('***\n','</span><br>')
                .replace('*** ','</span>')
                .replace('***','<span class="italics">')
                .replace('**\n','</span><br>')
                .replace('** ','</span><br>')
                .replace('**','<br><br><span class="bold">');
            var _dmgs = String(atk.automation[0].effects[0].hit[0].damage).split(']+');
            
            var damages = [];
            var damageString = [];
            for (var d=0;d<_dmgs.length;d++) {
                var dtype = _dmgs[d].split('[')[1].replace(']','');
                if (dtype.includes('magical')) {
                    dtype = dtype.split(' ')[1];
                    var magical = true;
                } else {
                    var magical = false;
                }
                damages.push({
                    "roll":_dmgs[d].split('[')[0].replace('+-','-'),
                    "type":dtype,
                    "magical":magical
                });
                if (magical) {
                    damageString.push(_dmgs[d].split('[')[0].replace('+-','-')+' magical '+dtype+' damage');
                } else {
                    damageString.push(_dmgs[d].split('[')[0].replace('+-','-')+' '+dtype+' damage');
                }
            }
            damageString = damageString.join(' plus ')+'.';
            var bonus = atk.automation[0].effects[0].attackBonus;

            var atkData = {
                'bonus':bonus,
                'damage':damages
            };

            var mainAtkEl = $(
                '<div id="atk_'+atk.name+'" name="'+atk.name+'" data=\''+JSON.stringify(atkData)+'\' class="atk-box">'+
                '<div class="atk-title">'+atk.name+'</div>'+
                '<div class="atk-content"><span class="bold">Description:</span><br> '+atkDesc+'</div>'+
                '<div class="atk-stats">'+
                '<span class="bold">Attack Bonus:</span> '+bonus+'<br>'+
                '<span class="bold">Damage:</span> '+damageString+'<br>'+
                '</div>'+
                '</div>'
            ).click(function(event){
                var data = JSON.parse($(event.delegateTarget).attr('data'));
                var magicOverride = $('#switch-magic').prop('checked');
                if (magicOverride) {
                    for (var a=0;a<data.damage.length;a++) {
                        data.damage[a].magical = true;
                    }
                }
                var toHit = 'd20';
                if ($('#switch-adv input').prop('checked') == true) {
                    toHit += 'kh1';
                } else if ($('#switch-dis input').prop('checked') == true) {
                    toHit += 'kl1';
                }
                data.toHit = toHit;
                scmd(
                    'pc_attack',
                    [currentInitTarget,$('#'+currentInitTarget).attr('mapid'),JSON.stringify(data)],
                    function(data) {
                        if (data.code == 200) {
                            var result = JSON.parse(data.result);
                            var rollData = 'You rolled a '+data.result.roll.roll+' on the d20 ('+data.result.roll.bonus_roll+' with modifiers applied).<br>'
                            if (data.result.roll.crit) {
                                rollData += ' Critical (Damage dice doubled on a hit).<br>';
                            }
                            if (result.hit) {
                                if (result.ko) {
                                    bootbox.alert(rollData+'You hit your target, dealing '+result.damage+'.<br> Your target was killed/knocked out.');
                                } else {
                                    bootbox.alert(rollData+'You hit your target, dealing '+result.damage+'.');
                                }
                            } else {
                                bootbox.alert(rollData+'You missed your target.');
                            }
                        }
                        command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                    }
                );
                $(document).click();
                currentInitTarget = null;
            });
            $('#actions-panel').append(mainAtkEl);
        }

        sidebarActivating = true;
        setTimeout(function(){
            sidebarActivating = false;
        },0.5);
        $('#initiative-sidebar').toggleClass('active',true);
        console.log('clicked');
    });
    $('#ctx_dm-attack').click(function(event){
        currentInitTarget = currentCtx;
        var map = null;
        for (var m=0;m<previousData.session.maps.length;m++) {
            if (previousData.session.maps[m].id == $('#'+currentInitTarget).attr('mapid')) {
                map = previousData.session.maps[m];
                break;
            }
        }
        if (!map) {
            return;
        }

        var npcData = map.npcs[previousData.session.initiative.order[previousData.session.initiative.rolls[previousData.session.initiative.index]].id].data;
        if (whatIsIt(npcData) == "string") {
            npcData = JSON.parse(npcData);
        }

        var npcAttacks = npcData.actions;
        console.log(npcAttacks);
        $('#actions-panel').html('');
        for (var a=0;a<npcAttacks.length;a++) {
            var atk = npcAttacks[a];
            var atkDesc = atk.desc;
            if (atk.automated) {
                var atkData = {
                    'bonus':atk.attack_bonus,
                    'damage':atk.damage,
                    'magical':false
                };
                if (atk.attack_bonus >= 0) {
                    var bonus = '+'+atk.attack_bonus.toString();
                } else {
                    var bonus = atk.attack_bonus.toString();
                }
                var _dmgs = atk.damage;
                var damageString = [];
                for (var d=0;d<_dmgs.length;d++) {
                    damageString.push(_dmgs[d].roll.toString()+' '+_dmgs[d].type.toString()+' damage');
                }
                damageString = damageString.join(' plus ')+'.';

                var mainAtkEl = $(
                    '<div id="atk_'+atk.name+'" name="'+atk.name+'" data=\''+JSON.stringify(atkData)+'\' class="atk-box">'+
                    '<div class="atk-title">'+atk.name+'</div>'+
                    '<div class="atk-content"><span class="bold">Description:</span><br> '+atkDesc+'</div>'+
                    '<div class="atk-stats">'+
                    '<span class="bold">Attack Bonus:</span> '+bonus+'<br>'+
                    '<span class="bold">Damage:</span> '+damageString+'<br>'+
                    '</div>'+
                    '</div>'
                ).click(function(event){
                    var data = JSON.parse($(event.delegateTarget).attr('data'));
                    var magicOverride = $('#switch-magic').prop('checked');
                    if (magicOverride) {
                        for (var a=0;a<data.damage.length;a++) {
                            data.damage[a].magical = true;
                        }
                    }
                    var toHit = 'd20';
                    if ($('#switch-adv input').prop('checked') == true) {
                        toHit += 'kh1';
                    } else if ($('#switch-dis input').prop('checked') == true) {
                        toHit += 'kl1';
                    }
                    data.toHit = toHit;
                    scmd(
                        'dm_attack',
                        [
                            currentInitTarget,
                            $('#'+currentInitTarget).attr('mapid'),
                            previousData.session.initiative.order[previousData.session.initiative.rolls[previousData.session.initiative.index]].id,
                            JSON.stringify(data)
                        ],
                        function(data) {
                            if (data.code == 200) {
                                var result = JSON.parse(data.result);
                                var rollData = 'You rolled a '+result.roll.roll+' on the d20 ('+result.roll.bonus_roll+' with modifiers applied).<br>'
                                if (result.roll.crit) {
                                    rollData += ' Critical (Damage dice doubled on a hit).<br>';
                                }
                                if (result.hit) {
                                    if (result.ko) {
                                        bootbox.alert(rollData+'You hit your target, dealing '+result.damage+'.<br> Your target was killed/knocked out.');
                                    } else {
                                        bootbox.alert(rollData+'You hit your target, dealing '+result.damage+'.');
                                    }
                                } else {
                                    bootbox.alert(rollData+'You missed your target.');
                                }
                            }
                            command('gsi',{'sid':params.get('id'),'print':BrowserFingerprint},API_PORT,refresh);
                        }
                    );
                    $(document).click();
                    currentInitTarget = null;
                });
            } else {
                var mainAtkEl = $(
                    '<div id="atk_'+atk.name+'" name="'+atk.name+'" class="atk-box">'+
                    '<div class="atk-title">'+atk.name+'</div>'+
                    '<div class="atk-content"><span class="bold">Description:</span><br> '+atkDesc+'</div>'+
                    '<div class="atk-stats"><span class="italics">Automation is not available for this action.</span></div>'+
                    '</div>'
                );
            }


            $('#actions-panel').append(mainAtkEl);
        }

        sidebarActivating = true;
        setTimeout(function(){
            sidebarActivating = false;
        },0.5);
        $('#initiative-sidebar').toggleClass('active',true);
        console.log('clicked');
    });

    $('#switch-adv input').click(function(){$('#switch-dis input').prop('checked',false)});
    $('#switch-dis input').click(function(){$('#switch-adv input').prop('checked',false)});
});