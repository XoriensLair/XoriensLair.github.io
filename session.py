from api import *
import base64
import json
import datetime
from threading import Thread
from hashlib import sha256
from random import random,randint
import pickle
import logging
import logging.config
from urllib.parse import urlparse
import d20
from configparser import ConfigParser
import time, os, shutil

class Session:
    def __init__(self,instance,_id,CONFIG,session=None,name='None'):
        self.logger = logging.LoggerAdapter(logging.getLogger('root'),{'location':'SESSION_'+name})
        self.logger.setLevel(CONFIG['Runtime']['logLevel'])
        self.id = _id
        if session:
            self.logger.debug('Loaded session from file.')
            session = json.loads(session)
            self.maps = session['maps']
            self.characters = session['characters']
            self.character_urls = session['character_urls']
            self.character_icons = session['character_icons']
            self.homebrew = session['homebrew']
            self.homebrew_urls = session['homebrew_urls']
            for k in self.characters.keys():
                if type(self.characters[k]) == str:
                    self.characters[k] = Character(_json=self.characters[k])
                else:
                    self.characters[k] = Character(_json=self.characters[k])
        else:
            self.logger.debug('Created new session.')
            self.maps = []
            self.characters = {}
            self.character_urls = {}
            self.character_icons = {}
            self.homebrew = []
            self.homebrew_urls = {}
        
        self.initiative_data = {
            'active':False,
            'order':{},
            'rolls':[],
            'index':0,
            'next':None
        }
        self.instance = instance

    def jsonify(self):
        ndct = {}
        for k in self.characters.keys():
            if type(self.characters[k]) == dict:
                ndct[k] = self.characters[k]
            elif type(self.characters[k]) == str:
                ndct[k] = json.loads(self.characters[k])
            else:
                ndct[k] = json.loads(self.characters[k].to_json())
        return {
            'maps':self.maps,
            'characters':ndct,
            'character_urls':self.character_urls,
            'character_icons':self.character_icons,
            'initiative':self.initiative_data,
            'homebrew':self.homebrew
        }
    
    def save(self,fp,args): # No arguments
        self.logger.debug('Saved session.')
        return {'save':self.jsonify()}

    def load_sheet(self,fp,args): # [URL]
        self.logger.debug('Loading sheet with URL '+args[0]+' for '+fp)
        url = args[0]
        if url.startswith('https://docs.google.com/spreadsheets'):
            char = Character(gurl=url.split('/')[5])
        elif url.startswith('{'):
            char = Character(_json=url)
        else:
            pass
        self.characters[fp] = char
        self.character_urls[fp] = url
        self.character_icons[fp] = 'Dice'
        return {'code':200}
    
    def _homebrew_has(self,ID):
        for h in self.homebrew:
            if ID == h['dbId']:
                return True
        return False
    
    def reload_homebrew(self,fp,args): # []
        self.logger.debug('Reloading homebrew critters from '+str(len(self.homebrew_urls.keys()))+' sources.')
        total_count = 0
        for k in self.homebrew_urls.keys():
            data = self.load_homebrew(fp,[k],replace=True)
            if data['code'] == 200:
                total_count += data['num_creatures']
        self.logger.debug('Reloaded '+str(total_count)+' creatures from CritterDB.')
        return {'code':200,'msg':'Reloaded '+str(total_count)+' creatures from CritterDB.'}
    
    def load_homebrew(self,fp,args,replace=False): # [CritterDB Creature or Bestiary URL]
        self.logger.debug('Loading homebrew from '+str(args[0]))
        url = args[0]
        if 'critterdb.com' in url:
            try:
                ID = urlparse(url).fragment.split('/')[3]
                if 'bestiary' in url:
                    all_creatures = api_get_bestiary(ID)
                    creatures = [i for i in all_creatures if not self._homebrew_has(i['dbId']) or replace]
                    if replace:
                        for c in creatures:
                            for h in range(len(self.homebrew)):
                                if self.homebrew[h]['dbId'] == c['dbId']:
                                    del self.homebrew[h]
                                    break
                            
                    self.homebrew.extend(creatures)
                    nc = len(creatures)
                    if not url in self.homebrew_urls.keys():
                        self.homebrew_urls[url] = all_creatures
                elif 'creature' in url:
                    crt = api_get_creature(ID)
                    if self._homebrew_has(crt['dbId']) and not replace:
                        nc = 0
                    else:
                        if replace:
                            for h in range(len(self.homebrew)):
                                if self.homebrew[h]['dbId'] == crt['dbId']:
                                    del self.homebrew[h]
                                    break
                        self.homebrew.append(crt)
                        nc = 1
                    if not url in self.homebrew_urls.keys():
                        self.homebrew_urls[url] = [crt]
                else:
                    self.logger.warning('Failed to load homebrew from '+str(url)+', invalid URL')
                    return {'code':400,'reason':'URL invalid.'}
                self.logger.debug('Homebrew loading success.')
                return {'code':200,'num_creatures':nc}
            except APIError:
                self.logger.exception('Exception in fetching '+str(url)+':')
                return {'code':404,'reason':'API Error'}
        else:
            self.logger.warning('Failed to load homebrew from '+str(url)+', invalid URL')
            return {'code':400,'reason':'URL invalid.'}
    
    def delete_homebrew(self,fp,args): # [Critter ID]
        self.logger.debug('Deleting homebrew with ID '+args[0])
        found = False
        for h in range(len(self.homebrew)):
            if self.homebrew[h]['dbId'] == args[0]:
                del self.homebrew[h]
                found = True
                for url in self.homebrew_urls.keys():
                    for crt in range(len(self.homebrew_urls[url])):
                        if self.homebrew_urls[url][crt]['dbId'] == args[0]:
                            del self.homebrew_urls[url][crt]
                break
        for url in self.homebrew_urls.keys():
            if len(self.homebrew_urls[url]) == 0:
                del self.homebrew_urls[url]
                self.logger.debug('There were no homebrew creatures left from '+url+', so it was deleted.')
        if found:
            return {'code':200}
        self.logger.warning('Homebrew ID "'+args[0]+'" not found.')
        return {'code':404,'reason':'Homebrew ID "'+args[0]+'" not found.'}
    
    def update_sheet(self,fp,args): # []
        if fp in self.character_urls.keys():
            return self.load_sheet(fp,[self.character_urls[fp]])
            self.logger.debug('Updated sheet for '+fp)
        else:
            self.logger.warning('Failure to update sheet for '+fp)
            return {'code':404,'reason':'PC not found. Load a sheet.'}
            
    
    def load_map(self,fp,args): # [Data URL, # Rows, # Columns, Feet/grid square]
        _id = sha256(str(time.time()*random()).encode('utf-8')).hexdigest()
        self.logger.debug('Loading map with ID '+str(_id))
        url = args[0]
        self.maps.append({
            'image': url,
            'id': _id,
            'grid_data':{
                'rows':args[1],
                'columns':args[2],
                'size':args[3]
            },
            'active': False,
            'markers': [],
            'npcs': {},
            'characters': {},
            'obscuration': {}
        })
        return {'code':200}
    
    def delete_map(self,fp,args): # [Map ID]
        _id = args[0]
        self.logger.debug('Deleting map '+str(_id))
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == _id:
                del self.maps[i]
                return {'code':200}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
    
    def modify_map(self,fp,args): # [Map ID, # Rows, # Columns, Feet/square, X, Y, Active]
        self.logger.debug('Modifying map'+str(args[0])+'with args'+str(args))
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                self.maps[i]['grid_data'] = {
                    'rows':args[1],
                    'columns':args[2],
                    'size':args[3]
                }
                self.maps[i]['active'] = args[4]
                return {'code':200}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
    
    def obscure(self,fp,args): # [Map ID, Top Corner X, Top Corner Y, Width, Height, Obscuration ID]
        self.logger.debug('Obscuring map '+args[0]+' with args '+str(args))
        args[1] = float(args[1])
        args[2] = float(args[2])
        args[3] = float(args[3])
        args[4] = float(args[4])
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                self.maps[i]['obscuration'][args[5]] = [args[1],args[2],args[3],args[4]]
                return {'code':200}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
    
    def remove_obscure(self,fp,args): # [Map ID, Obscuration ID]
        self.logger.debug('Removing obscure '+str(args[1])+' from map '+str(args[0]))
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                if args[1] in self.maps[i]['obscuration'].keys():
                    del self.maps[i]['obscuration'][args[1]]
                    return {'code':200}
                else:
                    self.logger.warning('User error - Obscure not found. User '+fp)
                    return {'code':404,'reason':'Obscure not found.'}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
    
    def activate_pc(self,fp,args): # [Map ID, Icon Name or Data URL, X, Y]
        self.logger.debug('Activating PC for user '+fp)
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                self.maps[i]['characters'][fp] = {
                    'name':self.characters[fp]['name'],
                    'pos':[int(args[2]),int(args[3])],
                    'icon':args[1]
                }
                self.logger.debug('Activated '+self.characters[fp]['name']+' on map '+args[0]+' for user '+fp)
                return {'code':200}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
    
    def move_pc(self,fp,args): # [Map ID, X, Y]
        self.logger.debug('Moving '+self.characters[fp]['name']+' on map '+args[0]+' for user '+fp+' to '+str(args[1:]))
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                if fp in self.maps[i]['characters'].keys():
                    self.maps[i]['characters'][fp]['pos'] = [int(float(args[1])),int(float(args[2]))]
                    return {'code':200}
                else:
                    self.logger.warning('User error - Character not found. User '+fp)
                    return {'code':404,'reason':'Character not found.'}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
    
    def modify_pc(self,fp,args): # [ID, Icon, List of keys and values ([['key1|key2|key3','value'],['key4|key5','value']])]
        self.logger.debug('Modifying PC '+args[0]+' with '+args[2])
        if (not args[0] in self.characters.keys()):
            self.logger.warning('User error - Character not found. User '+fp)
            return {'code':404,'reason':'Character not found.'}
        if str(args[1]) != '-1':
            self.character_icons[args[0]] = args[1]
            for m in range(len(self.maps)):
                if args[0] in self.maps[m]['characters'].keys():
                    self.maps[m]['characters'][args[0]]['icon'] = args[1]
        '''if str(args[2]) != '-1':
            self.characters[args[0]]['hp'] = int(args[2])
        if str(args[3]) != '-1':
            self.characters[args[0]]['max_hp'] = int(args[3])
        if str(args[4]) != '-1':
            self.characters[args[0]]['name'] = args[4]
            for m in range(len(self.maps)):
                if args[0] in self.maps[m]['characters'].keys():
                    self.maps[m]['characters'][args[0]]['name'] = args[4]'''
        outcomes = {}
        for i in eval(args[2]):
            try:
                try:
                    val = str(int(i[1]))
                except ValueError:
                    val = '"'+str(i[1])+'"'
                exec('self.characters[args[0]]["'+'"]["'.join(i[0].split('.'))+'"] = '+val)
                outcomes[i[0]] = 1
            except KeyError:
                outcomes[i[0]] = 0
            except IndexError:
                outcomes[i[0]] = 0
        return {'code':200,'data':json.loads(self.characters[args[0]].to_json()),'outcomes':outcomes}
    
    def deactivate_pc(self,fp,args): # [Map ID]
        self.logger.debug('Deactivating PC of User '+fp+' on map '+args[0])
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                if fp in self.maps[i]['characters'].keys():
                    del self.maps[i]['characters'][fp]
                    return {'code':200}
                else:
                    self.logger.warning('User error - Character not found. User '+fp)
                    return {'code':404,'reason':'Character not found.'}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
    
    def deactivate_pc_dm(self,fp,args): # [Map ID, PC ID]
        self.logger.debug('DM is deactivating PC of User '+args[1]+' on map '+args[0])
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                if args[1] in self.maps[i]['characters'].keys():
                    del self.maps[i]['characters'][args[1]]
                    return {'code':200}
                else:
                    self.logger.warning('User error - Character not found. User '+fp)
                    return {'code':404,'reason':'Character not found.'}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
    
    def assign_pc(self,fp,args): # [Old ID]
        found = False
        self.logger.debug('Assigning PC with ID '+args[0]+' to '+fp)
        for u in range(len(self.instance.sessions[self.id]['users'])):
            if self.instance.sessions[self.id]['users'][u]['fingerprint'] == args[0]:
                del self.instance.sessions[self.id]['users'][u]
                found = True
                break
        if args[0] in self.characters.keys():
            self.characters[fp] = self.characters[args[0]]
            self.character_urls[fp] = self.character_urls[args[0]]
            self.character_icons[fp] = self.character_icons[args[0]]
            del self.characters[args[0]]
            del self.character_urls[args[0]]
            del self.character_icons[args[0]]
            for m in range(len(self.maps)):
                if args[0] in self.maps[m]['characters'].keys():
                    self.maps[m]['characters'][fp] = self.maps[m]['characters'][args[0]]
                    del self.maps[m]['characters'][args[0]]
        if found:
            return {'code':200}
        self.logger.warning('User error - Character not found. User '+fp)
        return {'code':404,'reason':'Character not found'}
            

    def open5e(self,fp,args): 

        '''
        [Resource type (
        spells, 
        monsters, 
        documents, 
        backgrounds, 
        planes, 
        sections, 
        feats, 
        conditions, 
        races, 
        classes, 
        magicitems, 
        weapons, 
        search
        ), 
        **kwargs in "key,value" arrangement]
        '''

        restype = args.pop(0)
        arguments = []
        arg_keys = []
        for a in args:
            sp = a.split(',')
            arguments.append(tuple(sp))
            arg_keys.append(sp[0])
        rs = 'get(restype,'+','.join([n[0]+'="'+n[1]+'"' for n in arguments])+')'
        results = eval(rs)
        data = [i.json for i in results]
        if restype == 'monsters' and 'search' in arg_keys:
            adict = dict(arguments)
            for h in self.homebrew:
                if h['name'].lower() in adict['search'].lower() or adict['search'].lower() in h['name'].lower():
                    data.append(h)

        return {'code':200,'result':json.dumps({'data':data})}
    
    def add_npc(self,fp,args): # [Map ID, Icon, Data, X, Y]
        self.logger.debug('Creating NPC on '+args[0])
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                self.maps[i]['npcs'][sha256(str(time.time()*random()).encode('utf-8')).hexdigest()] = {
                    'icon':args[1],
                    'data':json.loads(args[2]),
                    'pos':[int(args[3]),int(args[4])],
                    'hp':int(json.loads(args[2])['hit_points'])
                }
                return {'code':200}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
  
    def modify_npc(self,fp,args): # [Map ID, NPC ID, Data, Current HP, X, Y]
        self.logger.debug('Modifying NPC '+args[1]+' on map '+args[0])
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                if args[1] in self.maps[i]['npcs'].keys():
                    self.maps[i]['npcs'][args[1]]['data'] = args[2]
                    self.maps[i]['npcs'][args[1]]['hp'] = args[3]
                    self.maps[i]['npcs'][args[1]]['pos'] = [int(args[4]),int(args[5])]
                    return {'code':200}
                else:
                    self.logger.warning('User error - NPC not found. User '+fp)
                    return {'code':404,'reason':'NPC not found.'}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}

    def remove_npc(self,fp,args): # [Map ID, NPC ID]
        self.logger.debug('Removing NPC '+args[1]+' from map '+args[0])
        for i in range(len(self.maps)):
            if self.maps[i]['id'] == args[0]:
                if args[1] in self.maps[i]['npcs'].keys():
                    del self.maps[i]['npcs'][args[1]]
                    return {'code':200}
                else:
                    self.logger.warning('User error - NPC not found. User '+fp)
                    return {'code':404,'reason':'NPC not found.'}
        self.logger.warning('User error - Map not found. User '+fp)
        return {'code':404,'reason':'Map not found.'}
    
    def initiative(self,fp,args): # [Command, Map ID, NPC ID if applicable (otherwise -1)]
        if not args[0] == 'check':
            self.logger.debug('User '+fp+' is executing an initiative subcommand ('+args[0]+') on map '+args[1])
        code, dat = self.instance.check_user({'fingerprint':fp})

        if args[0] == 'roll':
            if dat['type'] == 'pc':
                roll = randint(1,20)+int(self.characters[fp]['skills']['initiative']['value'])+(random()/10)
                data = self.characters[fp].to_json()
                ID = fp
                index = -1
                for i in range(len(self.maps)):
                    if self.maps[i]['id'] == args[1]:
                        index = i
                if index >= 0:
                    name = self.characters[fp]['name']
                    icon = self.maps[index]['characters'][fp]['icon']
                else:
                    return {'code':404,'reason':'Map not found'}
                
            else:
                index = -1
                for i in range(len(self.maps)):
                    if self.maps[i]['id'] == args[1]:
                        index = i
                if index >= 0:
                    if type(self.maps[index]['npcs'][args[2]]['data']) == str:
                        npc = json.loads(self.maps[index]['npcs'][args[2]]['data'])
                    else:
                        npc = self.maps[index]['npcs'][args[2]]['data']
                    name = npc['name']
                    icon = self.maps[index]['npcs'][args[2]]['icon']
                    data = json.dumps(self.maps[index]['npcs'][args[2]]['data'])
                    roll = randint(1,20)+getmod(int(npc['dexterity']))+(random()/10)
                    ID = args[2]
                else:
                    return {'code':404,'reason':'Map not found'}
            
            self.initiative_data['rolls'].append(roll)
            self.initiative_data['rolls'].sort(reverse=True)
            self.initiative_data['order'][roll] = {
                'type':dat['type'],
                'data':data,
                'id':ID,
                'icon':icon,
                'name':name
            }
            self.initiative_data['active'] = True
            return {'code':200,'roll':int(roll),'place':self.initiative_data['rolls'].index(roll)}
        elif args[0] == 'check':
            if len(self.initiative_data['rolls']) == 0 or self.initiative_data['active'] == False:
                self.initiative_data['active'] = False
                return {
                    'code':200,
                    'current':{},
                    'next':{}
                }

            try:
                return {
                    'code':200,
                    'current':self.initiative_data['order'][self.initiative_data['rolls'][self.initiative_data['index']]],
                    'next':self.initiative_data['order'][self.initiative_data['rolls'][self.initiative_data['index']+1]]
                    }
            except IndexError:
                try:
                    return {
                        'code':200,
                        'current':self.initiative_data['order'][self.initiative_data['rolls'][self.initiative_data['index']]],
                        'next':self.initiative_data['order'][self.initiative_data['rolls'][0]]
                        }
                except IndexError:
                    return {
                        'code':200,
                        'current':self.initiative_data['order'][self.initiative_data['rolls'][0]],
                        'next':self.initiative_data['order'][self.initiative_data['rolls'][0]]
                        }
        elif args[0] == 'remove':
            if dat['type'] == 'pc':
                to_delete = None
                for k in self.initiative_data['order'].keys():
                    if self.initiative_data['order'][k]['id'] == fp:
                        to_delete = k
                if to_delete != None:
                    del self.initiative_data['order'][to_delete]
                    self.initiative_data['rolls'].remove(to_delete)
            else:
                to_delete = None
                for k in self.initiative_data['order'].keys():
                    if self.initiative_data['order'][k]['id'] == args[2]:
                        to_delete = k
                if to_delete != None:
                    del self.initiative_data['order'][to_delete]
                    self.initiative_data['rolls'].remove(to_delete)
            return {'code':200,'data':self.initiative_data['rolls']}
        elif args[0] == 'next' and dat['type'] == 'dm':
            while True:
                self.initiative_data['index'] += 1
                if self.initiative_data['index'] >= len(self.initiative_data['rolls']):
                    self.initiative_data['index'] = 0
                if self.initiative_data['order'][self.initiative_data['rolls'][self.initiative_data['index']]]['type'] == 'dm':
                    found = False
                    for m in self.maps:
                        if self.initiative_data['order'][self.initiative_data['rolls'][self.initiative_data['index']]]['id'] in m['npcs'].keys():
                            found = True
                    if not found:
                        self.logger.debug('Deleting NPC '+self.initiative_data['order'][self.initiative_data['rolls'][self.initiative_data['index']]]['id']+' because it has died.')
                        del self.initiative_data['order'][self.initiative_data['rolls'][self.initiative_data['index']]]
                        del self.initiative_data['rolls'][self.initiative_data['index']]
                    else:
                        break
                else:
                    break
                        
            return {'code':200,'current':self.initiative_data['order'][self.initiative_data['rolls'][self.initiative_data['index']]]}
            
        elif args[0] == 'end' and dat['type'] == 'dm':
            self.initiative_data = {
                'active':False,
                'order':{},
                'rolls':[],
                'index':0
            }
            return {'code':200}
        return {'code':404,'reason':'Command not found or forbidden'}
    
    def delete_user(self,fp,args): # [User ID]
        self.logger.debug('Removing PC with ID '+args[0])
        if args[0] in self.characters.keys():
            del self.characters[args[0]]
            del self.character_urls[args[0]]
            del self.character_icons[args[0]]
            for m in range(len(self.maps)):
                if args[0] in self.maps[m]['characters'].keys():
                    del self.maps[m]['characters'][args[0]]
        for u in range(len(self.instance.sessions[self.id]['users'])):
            if self.instance.sessions[self.id]['users'][u]['fingerprint'] == args[0]:
                del self.instance.sessions[self.id]['users'][u]
                return {'code':200}
        
        self.logger.warning('User error - Character not found. User '+fp)
        return {'code':404,'reason':'Character not found'}
    
    def pc_attack(self,fp,args): # [Target, Map ID, Attack data]
        self.logger.debug('PC '+fp+' is attacking '+str(args[0]))
        data = json.loads(args[2])
        self.logger.debug('ATK data: '+str(data))
        roll = int(d20.roll(data['toHit']))
        crit = False
        if (roll == 20):
            crit = True
        
        rollData = {
            'roll':roll,
            'bonus_roll':roll + int(data['bonus']),
            'crit':crit
        }
        
        roll += int(data['bonus'])
        if args[0] in self.characters.keys():
            if roll >= int(self.characters[args[0]]['ac']):
                damage_log = []
                total_damage = 0
                for d in data['damage']:
                    damage = int(d20.roll(d['roll']))
                    if crit:
                        damage += int(d20.roll(d['roll']))
                    for r in [('vuln',2),('resist',0.5),('immune',0)]:
                        if d['type'] in self.characters[args[0]]['resistances'][r[0]]:
                            damage = damage * r[1]
                    damage = abs(int(damage))
                    total_damage += damage
                    damage_log.append(str(damage)+' '+d['type']+' damage')
                self.characters[args[0]]['hp'] -= total_damage
                damage_log = ', '.join(damage_log).rpartition(', ')
                if damage_log[0] == '':
                    damage_log = damage_log[2]
                else:
                    damage_log = damage_log[0] + ', and ' + damage_log[2]
                self.logger.debug('PC '+fp+' dealt '+damage_log+' to '+str(self.characters[args[0]]['name']))
                KO = False
                if self.characters[args[0]]['hp'] < 0:
                    self.characters[args[0]]['hp'] = 0
                    self.logger.debug('PC '+fp+' knocked out PC '+str(args[0]))
                    KO = True
                return {'code':200,'result':json.dumps({'hit':True,'damage':damage_log,'ko':KO,'roll':rollData})}
            else:
                self.logger.debug('PC '+fp+' missed their attack on '+str(args[0]))
                return {'code':200,'result':json.dumps({'hit':False,'damage':None,'ko':False,'roll':rollData})}
            
        else:
            for m in range(len(self.maps)):
                if args[0] in self.maps[m]['npcs'].keys():
                    if roll >= int(self.maps[m]['npcs'][args[0]]['data']['armor_class']):
                        damage_log = []
                        total_damage = 0
                        for d in data['damage']:
                            damage = int(d20.roll(d['roll']))
                            if crit:
                                damage += int(d20.roll(d['roll']))
                            resist = dict(
                                resist = self.maps[m]['npcs'][args[0]]['data']['damage_resistances'].replace(', ','|').split(','),
                                immune = self.maps[m]['npcs'][args[0]]['data']['damage_immunities'].replace(', ','|').split(','),
                                vuln = self.maps[m]['npcs'][args[0]]['data']['damage_vulnerabilities'].replace(', ','|').split(',')
                            )
                            for r in [('vuln',2),('resist',0.5),('immune',0)]:
                                for k in resist[r[0]]:
                                    if d['type'] == k:
                                        damage = damage * r[1]
                                        break
                                    if ('nonmagic' in k or 'non-magic' in k) and not d['magical']:
                                        for _d in ['piercing','slashing','bludgeoning']:
                                            if d['type'] == _d and _d in k:
                                                damage = damage * r[1]
                                                break
                            damage = abs(int(damage))
                            total_damage += damage
                            damage_log.append(str(damage)+' '+d['type']+' damage')
                        self.maps[m]['npcs'][args[0]]['hp'] -= total_damage
                        damage_log = ', '.join(damage_log).rpartition(', ')
                        if damage_log[0] == '':
                            damage_log = damage_log[2]
                        else:
                            damage_log = damage_log[0] + ', and ' + damage_log[2]
                        self.logger.debug('PC '+fp+' dealt '+damage_log+' to NPC '+str(args[0]))
                        KO = False
                        if self.maps[m]['npcs'][args[0]]['hp'] <= 0:
                            self.logger.debug('PC '+fp+' killed NPC '+str(args[0]))
                            del self.maps[m]['npcs'][args[0]]
                            KO = True
                        return {'code':200,'result':json.dumps({'hit':True,'damage':damage_log,'ko':KO,'roll':rollData})}
                    else:
                        self.logger.debug('PC '+fp+' missed their attack on '+str(args[0]))
                        return {'code':200,'result':json.dumps({'hit':False,'damage':None,'ko':False,'roll':rollData})}
            self.logger.warning('NPC '+str(args[0])+' not found.')
            return {'code':404,'reason':'NPC '+str(args[0])+' not found.'}
        
    def dm_attack(self,fp,args): # [Target, Map ID, Source, Attack data]
        self.logger.debug('NPC '+str(args[2])+' is attacking '+str(args[0]))
        data = json.loads(args[3])
        self.logger.debug('ATK data: '+str(data))
        roll = int(d20.roll(data['toHit']))
        crit = False
        if (roll == 20):
            crit = True
        
        rollData = {
            'roll':roll,
            'bonus_roll':roll + int(data['bonus']),
            'crit':crit
        }
        
        roll += int(data['bonus'])
        if args[0] in self.characters.keys():
            if roll >= int(self.characters[args[0]]['ac']):
                damage_log = []
                total_damage = 0
                for d in data['damage']:
                    damage = int(d20.roll(d['roll']))
                    if crit:
                        damage += int(d20.roll(d['roll']))
                    for r in [('vuln',2),('resist',0.5),('immune',0)]:
                        if d['type'] in self.characters[args[0]]['resistances'][r[0]]:
                            damage = damage * r[1]
                    damage = abs(int(damage))
                    total_damage += damage
                    damage_log.append(str(damage)+' '+d['type']+' damage')
                self.characters[args[0]]['hp'] -= total_damage
                damage_log = ', '.join(damage_log).rpartition(', ')
                if damage_log[0] == '':
                    damage_log = damage_log[2]
                else:
                    damage_log = damage_log[0] + ', and ' + damage_log[2]
                self.logger.debug('NPC '+str(args[2])+' dealt '+damage_log+' to '+str(self.characters[args[0]]['name']))
                KO = False
                if self.characters[args[0]]['hp'] < 0:
                    self.characters[args[0]]['hp'] = 0
                    self.logger.debug('NPC '+str(args[2])+' knocked out PC '+str(args[0]))
                    KO = True
                return {'code':200,'result':json.dumps({'hit':True,'damage':damage_log,'ko':KO,'roll':rollData})}
            else:
                self.logger.debug('NPC '+str(args[2])+' missed their attack on NPC '+str(args[0]))
                return {'code':200,'result':json.dumps({'hit':False,'damage':None})}
            
        else:
            for m in range(len(self.maps)):
                if args[0] in self.maps[m]['npcs'].keys():
                    if roll >= int(self.maps[m]['npcs'][args[0]]['data']['armor_class']):
                        damage_log = []
                        total_damage = 0
                        for d in data['damage']:
                            damage = int(d20.roll(d['roll']))
                            if crit:
                                damage += int(d20.roll(d['roll']))
                            resist = dict(
                                resist = self.maps[m]['npcs'][args[0]]['data']['damage_resistances'].replace(', ','|').split(','),
                                immune = self.maps[m]['npcs'][args[0]]['data']['damage_immunities'].replace(', ','|').split(','),
                                vuln = self.maps[m]['npcs'][args[0]]['data']['damage_vulnerabilities'].replace(', ','|').split(',')
                            )
                            for r in [('vuln',2),('resist',0.5),('immune',0)]:
                                for k in resist[r[0]]:
                                    if d['type'] == k:
                                        damage = damage * r[1]
                                        break
                                    if ('nonmagic' in k or 'non-magic' in k) and not d['magical']:
                                        for _d in ['piercing','slashing','bludgeoning']:
                                            if d['type'] == _d and _d in k:
                                                damage = damage * r[1]
                                                break
                            damage = abs(int(damage))
                            total_damage += damage
                            damage_log.append(str(damage)+' '+d['type']+' damage')
                        self.maps[m]['npcs'][args[0]]['hp'] -= total_damage
                        damage_log = ', '.join(damage_log).rpartition(', ')
                        if damage_log[0] == '':
                            damage_log = damage_log[2]
                        else:
                            damage_log = damage_log[0] + ', and ' + damage_log[2]
                        self.logger.debug('PC '+fp+' dealt '+damage_log+' to NPC '+str(args[0]))
                        KO = False
                        if self.maps[m]['npcs'][args[0]]['hp'] <= 0:
                            self.logger.debug('PC '+fp+' killed NPC '+str(args[0]))
                            del self.maps[m]['npcs'][args[0]]
                            KO = True
                        return {'code':200,'result':json.dumps({'hit':True,'damage':damage_log,'ko':KO,'roll':rollData})}
                    else:
                        self.logger.debug('PC '+fp+' missed their attack on '+str(args[0]))
                        return {'code':200,'result':json.dumps({'hit':False,'damage':None,'ko':False,'roll':rollData})}
            self.logger.warning('NPC '+str(args[0])+' not found.')
            return {'code':404,'reason':'NPC '+str(args[0])+' not found.'}

    def roll(self,fp,args): # [Roll string]
        self.logger.debug('User '+fp+' is rolling '+args[0])
        try:
            roll = d20.roll(args[0])
            elements = str(roll)
            print(elements)
            self.logger.debug('User '+fp+' rolled '+args[0]+' and got '+str(roll.total))
            return {'code':200,'roll':roll.total,'elements':elements}
        except d20.errors.RollSyntaxError as e:
            self.logger.exception('Dice error: ')
            return {'code':400,'reason':'Dice error: '+str(e)}
    
    def _send_message(self,source,target,content): # send_message backend for programmatic use
        if target == '*':
            targets = [i['fingerprint'] for i in self.instance.sessions[self.id]['users']]
        elif target == 'dm':
            targets = [i['fingerprint'] for i in self.instance.sessions[self.id]['users'] if i['type'] == 'dm']
        else:
            targets = [target]
        
        for t in targets:
            try:
                for u in range(len(self.instance.sessions[self.id]['users'])):
                    if self.instance.sessions[self.id]['users'][u]['fingerprint'] == t:
                        self.instance.sessions[self.id]['users'][u]['messages'].append({
                            'source':source,
                            'content':content,
                            'read':False,
                            'timestamp':time.time()
                        })
            except KeyError:
                self.logger.exception('Failed to send message to USER '+str(t)+' with following exception information:')

    
    def send_message(self,fp,args): # [Target (*, dm, or user id), Content]
        src = fp
        for u in self.instance.sessions[self.id]['users']:
            if u['fingerprint'] == fp:
                src = u['name']
                break
        self.logger.debug('Sending message from '+str(src)+' to '+str(args[0]))

        self._send_message(src,args[0],args[1])
        return {'code':200}
    
    def read_messages(self,fp,args): # []
        for u in range(len(self.instance.sessions[self.id]['users'])):
            if self.instance.sessions[self.id]['users'][u]['fingerprint'] == fp:
                for m in range(len(self.instance.sessions[self.id]['users'][u]['messages'])):
                    self.instance.sessions[self.id]['users'][u]['messages'][m]['read'] = True;
                break
        return {'code':200}
    
    def sys_message(self,fp,args): # [Target (*, dm, or user id), Content]
        src = 'System'
        self.logger.debug('Sending message from '+str(src)+' to '+str(args[0]))

        self._send_message(src,args[0],args[1])
        return {'code':200}