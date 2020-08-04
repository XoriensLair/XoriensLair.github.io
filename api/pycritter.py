import requests, json, re
from threading import Thread
import time

_token = None
user_id = None


class APIError(Exception):
    pass


def error(res):
    if res.status_code == 200 or res.status_code == 201:
        pass
    else:
        raise APIError('Error {}. The server returned the following message:\n'
                       '{}'.format(res.status_code, res.text))
    return res.json()


def _url(path):
    return 'https://critterdb.com/api' + path


# Creatures
def get_creature(id):
    return error(requests.get(
        url=_url('/creatures/' + id)
    ))


def create_creature(creature):
    return error(requests.post(
        url=_url('/creatures'),
        headers={'x-access-token': token,
                 'Content-Type': 'application/json'},
        body=creature
        ))


def update_creature(id, creature):
    return error(requests.put(
        url=_url('/creatures/' + id),
        headers={'x-access-token': token,
                 'Content-Type': 'application/json'},
        body=creature
        ))


def delete_creature(id):
    return error(requests.delete(
        url=_url('/creatures/' + id),
        headers={'x-access-token': token}
    ))


# Bestiaries
def get_bestiary(id):
    return error(requests.get(
        url=_url('/bestiaries/' + id)
        ))


def get_bestiary_creatures(id):
    return error(requests.get(
        url=_url('/bestiaries/' + id + '/creatures')
        #headers={'x-access-token': token}
        ))


def create_bestiary(bestiary):
    """bestiary should be json with the following structure:
    {
        "name": "your string, required",
        "description": "your string, optional",
        "ownerId": "your userId string, required"
    }
    """
    return error(requests.post(
        url=_url('/bestiaries'),
        headers={'x-access-token': token,
                 'Content-Type': 'application/json'},
        body=bestiary
        ))


def update_bestiary(id, bestiary):
    """bestiary should be JSON as returned by get_bestiary"""
    return error(requests.put(
        url=_url('/bestiaries/' + id),
        headers={'x-access-token': token,
                 'Content-Type': 'application/json'},
        body=bestiary
        ))


def delete_bestiary(id):
    return error(requests.delete(
        url=_url('/bestiaries/' + id),
        headers={'x-access-token': token}
        ))


# Published bestiaries
def search_published(query, page=1):
    """query should be JSON with structure:
    {"name": "your search term"}
    """
    return error(requests.post(
        url=_url('publishedbestiaries/search/' + str(page)),
        body=query
    ))


def like(id):
    return error(requests.post(
        url=_url('publishedbestiaries/' + id + '/likes'),
        headers={'x-access-token': token}
    ))


def unlike(id):
    return error(requests.delete(
        url=_url('publishedbestiaries/' + id + '/likes'),
        headers={'x-access-token': token}
    ))


def favorite(id):
    return error(requests.post(
        url=_url('publishedbestiaries/' + id + '/favorites'),
        headers={'x-access-token': token}
    ))


def unfavorite(id):
    return error(requests.delete(
        url=_url('publishedbestiaries/' + id + '/favorites'),
        headers={'x-access-token': token}
    ))


def get_most_popular():
    return error(requests.get(
        url=_url('/publishedbestiaries/mostpopular')
    ))


def get_recent(page):
    return error(requests.get(
        url=_url('/publishedbestiaries/recent/' + str(page))
    ))


def get_popular(page):
    return error(requests.get(
        url=_url('/publishedbestiaries/popular/' + str(page))
    ))


def get_favorites(page):
    return error(requests.get(
        url=_url('/publishedbestiaries/favorites/' + str(page)),
        headers={'x-access-token': token}
    ))


def get_owned(page):
    return error(requests.get(
        url=_url('/publishedbestiaries/owned/' + str(page)),
        headers={'x-access-token': token}
    ))


def add_comment(id, comment):
    """{
        "text": "comment text",
        "author": "user id"
    }"""
    return error(requests.put(
        url=_url('/publishedbestiaries/' + id + '/comments'),
        headers={'x-access-token': token,
                 'Content-Type': 'application/json'},
        body=comment
    ))


def update_comment(bestiary_id, comment_id, comment):
    return error(requests.put(
        url=_url('/publishedbestiaries/' + bestiary_id
                 + '/comments/' + comment_id),
        headers={'x-access-token': token},
        body=comment
        ))


def delete_comment(bestiary_id, comment_id):
    return error(requests.delete(
        url=_url('/publishedbestiaries/' + bestiary_id
                 + '/comments/' + comment_id),
        headers={'x-access-token': token}
        ))


def get_published_creatures(id, page):
    return error(requests.get(
        url=_url('/publishedbestiaries/' + id + '/creatures')
        ))


def delete_published_creatures(id):
    """Deletes ALL creatures from selected published bestiary."""
    return error(requests.delete(
        url=_url('/publishedbestiaries/' + id),
        headers={'x-access-token': token}
        ))


def get_published(id):
    return error(requests.get(
        url=_url('/publishedbestiaries/' + id)
        ))


def create_published(bestiary):
    return error(requests.post(
        url=_url('/publishedbestiaries'),
        headers={'x-access-token': token,
                 'Content-Type': 'application/json'},
        body=bestiary
        ))


def update_published(id, bestiary):
    return error(requests.put(
        url=_url('/publishedbestiaries' + id),
        headers={'x-access-token': token,
                 'Content-Type': 'application/json'},
        body=bestiary
        ))


def delete_published(id):
    return error(requests.delete(
        url=_url('/publishedbestiaries' + id),
        headers={'x-access-token': token}
        ))


# Users
def get_user_bestiaries():
    return error(requests.get(
        url=_url('/users/' + str(user_id) + '/bestiaries'),
        headers={'x-access-token': token}
        ))


def get_user_published(page):
    return error(requests.get(
        url=_url('/users/' + str(user_id) + '/publishedbestiaries/' + page)
        ))


def get_user_creatures(page):
    return error(requests.get(
        url=_url('/users/' + str(user_id) + '/creatures/' + page),
        headers={'x-access-token': token}
        ))


def get_public():
    return error(requests.get(
        url=_url('/users/' + str(user_id) + '/public'),
        headers={'x-access-token': token}
        ))


def search_public(user_dict):
    return error(requests.get(
        url=_url('/users/search'),
        headers={'x-access-token': token,
                 'Content-Type': 'application/json'},
        json=user_dict
        ))

# I'm going to leave user management alone for now. There aren't many legit
# reasons to create or delete users through the API (that I can think of).


# Authentication
def get_current_user():
    return error(requests.get(
        url=_url('/authenticate/user'),
        headers={'x-access-token': token}
    ))


def login(username, password, rememberme=False):
    global token, user_id
    auth_dict = {'username': username,
                 'password': password,
                 'rememberme': rememberme}
    res = requests.post(
        url=_url('/authenticate'),
        headers={'Content-Type': 'application/json'},
        json=auth_dict
    )
    if res.status_code == 200 or res.status_code == 201:
        token = res.text
        user_id = get_current_user()['_id']
    else:
        raise APIError('Error {}. The server returned the following message:\n'
                       '{}'.format(res.status_code, res.text))


# The revokeauthentication endpoint seems to only be to clear auth cookies.
def logout():
    res = requests.get(url=_url('/revokeauthentication'))
    if res.status_code == 200 or res.status_code == 201:
        pass
    else:
        raise APIError('Error {}. The server returned the following message:\n'
                       '{}'.format(res.status_code, res.text))


#Code added by Matteo

#math libs
from fractions import Fraction

damage_types = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']

class Item: #Item class from accessapi code
    def resolve_list(self,lst):
        rl = []
        for i in lst:
            if type(i) == dict:
                rl.append(Item(i))
            elif type(i) == list:
                rl.append(self.resolve_list(i))
            else:
                rl.append(i)
        return rl
    def __init__(self,dct):
        self.dct = dct
        for d in dct.keys():
            if type(dct[d]) == dict:
                setattr(self,d,Item(dct[d]))
            elif type(dct[d]) == list:
                setattr(self,d,self.resolve_list(dct[d]))
            else:
                setattr(self,d,dct[d])

def parse_5e(action):
    try:
        if action['desc'].startswith('Melee Weapon Attack: ') or action['desc'].startswith('Ranged Weapon Attack: '):
            damages = re.split(r'.{0,50}: ',action['desc'])[2].split(' plus ')
        else:
            damages = action['desc'].split(' Hit: ')[1].split(' plus ')
        damage_exps = []
        for d in damages:
            damage_exp = {}
            damage_exp['roll'] = re.split(r'\).{0,1000}',re.split(r'.{0,50}\(',d)[1])[0].replace(' ','')
            damage_exp['type'] = 'bludgeoning'
            for dt in damage_types:
                if dt in d:
                    damage_exp['type'] = dt
            damage_exps.append(damage_exp)

        bonus = int(action['desc'].split(': ')[1].split(',')[0].split(' ')[0].lower().strip('+ .,!?qwertyuiopasdfghjklzxcvbnm'))
        action['attack_bonus'] = bonus
        action['damage'] = damage_exps
        action['automated'] = True
        return action
    except:
        action['automated'] = False
        return action

def action_parse(action): # Parse an action string
    try:
        if action['desc'].startswith('<i>Melee Weapon Attack:</i>') or action['desc'].startswith('<i>Ranged Weapon Attack:</i>'):
            initial_parse = [i.strip() for i in re.split(r'<i>.{0,50}</i>',action['desc'])[1:]]
            info = {}
            info['attack'] = [i.strip('.,+ ') for i in initial_parse[0].split(', ')][:2]
            info['damage'] = [i.strip('., ') for i in initial_parse[1].split(' plus ')]
            
            damages = []
            for i in info['damage']:
                roll = re.split(r'\).{0,1000}',re.split(r'.{0,50}\(',i)[1])[0].replace(' ','')
                dtype = 'bludgeoning'
                for d in damage_types:
                    if d in i:
                        dtype = d
                damages.append({
                    'roll':roll,
                    'type':dtype
                })
            
            ret = action
            ret['attack_bonus'] = int(info['attack'][0].split(' ')[0])
            ret['damage'] = damages
            ret['automated'] = True
            return ret
        else:
            action['automated'] = False
            return action
    except:
        action['automated'] = False
        return action

def get_mod(score): #code from character to translate a score into a modifier
    modref = {
        '1':-5,
        '2-3':-4,
        '4-5':-3,
        '6-7':-2,
        '8-9':-1,
        '10-11':0,
        '12-13':1,
        '14-15':2,
        '16-17':3,
        '18-19':4,
        '20-21':5,
        '22-23':6,
        '24-25':7,
        '26-27':8,
        '28-29':9,
        '30':10
    }

    for k in modref.keys():
        if str(score) in k.split('-'):
            return modref[k]
    return None

def get_prof_cr(cr): #determines proficiency bonus from challenge rating
    ref = {
        4:2,
        8:3,
        12:4,
        16:5,
        20:6,
        24:7,
        28:8,
        30:9
    } #dict of MM Page 8 proficiency bonuses
    keyref = [4,8,12,16,20,24,28,30] #order of keys to check
    for i in keyref: #check keys
        if cr <= i:
            return ref[i]

def get_skill_ability(skill): #gets ability of specific skill
    skills = (
        ('strength',('athletics')),
        ('dexterity',('acrobatics','sleight_of_hand','stealth')),
        ('constitution',()),
        ('intelligence',('arcana','history','investigation','nature','religion')),
        ('wisdom',('animal_handling','insight','medicine','perception','survival')),
        ('charisma',('deception','intimidation','performance','persuasion'))
    ) #skill reference
    for s in skills: #check all
        if skill in s[1]:
            return s[0]

def api_get_creature(ID=None,_dict=None,instance=None):
    if ID:
        item = Item(get_creature(ID)) #create item for easy access
    elif _dict:
        item = Item(_dict)
    else:
        raise ValueError('Input ID or _dict')
    
    output = {}
    #manual item assignment =======================================================================
    #determine raw attributes
    output['homebrew'] = True
    output['name'] = item.name
    output['slug'] = item.name.lower()
    output['dbId'] = item._id
    output['size'] = item.stats.size
    output['type'] = str(item.stats.race).lower()
    output['alignment'] = str(item.stats.alignment).lower()
    output['armor_class'] = item.stats.armorClass
    output['armor_desc'] = str(item.stats.armorType).lower()
    output['challenge_rating'] = str(Fraction.from_float(item.stats.challengeRating))
    output['damage_resistances'] = ','.join([i.lower() for i in item.stats.damageResistances])
    output['damage_vulnerabilities'] = ','.join([i.lower() for i in item.stats.damageVulnerabilities])
    output['damage_immunities'] = ','.join([i.lower() for i in item.stats.damageImmunities])
    output['img_main'] = item.flavor.imageUrl
    prof = item.stats.proficiencyBonus

    #determine HP & HD
    output['hit_points'] = int((item.stats.numHitDie*item.stats.hitDieSize)*0.5)+(get_mod(item.stats.abilityScores.strength)*item.stats.numHitDie)
    output['hit_dice'] = str(item.stats.numHitDie)+'d'+str(item.stats.hitDieSize)+'+'+str((get_mod(item.stats.abilityScores.strength)*item.stats.numHitDie))
    
    #parse speed string
    speed_dict = {}
    for i in item.stats.speed.split(', '):
        info = i[:len(i)-4].split(' ')
        if len(info) == 1:
            try:
                speed_dict['walk'] = int(info[0])
            except ValueError:
                speed_dict['walk'] = info[0]
        else:
            try:
                speed_dict[info[0]] = int(info[1])
            except ValueError:
                speed_dict[info[0]] = info[1]
    output['speed'] = speed_dict
    for i in item.stats.abilityScores.dct.keys():
        output[i] = item.stats.abilityScores.dct[i]
    
    #generate saves
    saves = {}
    for i in list(item.stats.savingThrows):
        if i.proficient:
            saves[i.ability] = get_mod(item.stats.abilityScores.dct[i.ability]) + prof
        else:
            saves[i.ability] = get_mod(item.stats.abilityScores.dct[i.ability])
    for i in item.stats.abilityScores.dct.keys():
        if i in saves.keys():
            output[i+'_save'] = saves[i]
        else:
            output[i+'_save'] = None
    
    #generate skills
    skills = {}
    for i in list(item.stats.skills):
        if i.proficient:
            name = i.name.lower().replace(' ','_')
            skills[name] = get_mod(item.stats.abilityScores.dct[get_skill_ability(name)]) + prof
        else:
            skills[i.name.lower()] = get_mod(item.stats.abilityScores.dct[get_skill_ability(i.name.lower())])
    output['skills'] = skills

    #determine perception bonus
    if 'perception' in skills.keys():
        output['perception'] = 10 + output['skills']['perception']
    else:
        output['perception'] = 10
    
    #assemble senses
    output['senses'] = ', '.join(list(item.stats.senses))

    #describe abilities
    output['actions'] = []
    for i in list(item.stats.actions):
        output['actions'].append(action_parse({'name':i.name,'desc':i.description}))
    output['special_abilities'] = []
    for i in list(item.stats.additionalAbilities):
        output['special_abilities'].append({'name':i.name,'desc':i.description})
    output['reactions'] = []
    for i in list(item.stats.reactions):
        output['reactions'].append({'name':i.name,'desc':i.description})
    output['legendary_actions'] = []
    for i in list(item.stats.legendaryActions):
        output['legendary_actions'].append({'name':i.name,'desc':i.description})
    
    if instance:
        instance.result = output
    return output

class Timeout:
    def __init__(self,f,_time=2,args=[],kwargs={}):
        self.result = None
        kwargs['instance'] = self
        self.thread = Thread(target=f,args=args,kwargs=kwargs)
        self.thread.start()
        c = 0
        while c < _time*100 and not self.result:
            time.sleep(0.01)
            c+=1


def api_get_bestiary(ID):
    creatures = get_bestiary_creatures(ID)
    ret = []
    for creature in creatures:
        ret.append(Timeout(api_get_creature,kwargs={'_dict':creature}).result)
    return ret

if __name__ == "__main__":
    with open('bestiary.json','w') as f:
        json.dump(api_get_creature('5ed28cc663a0580dfd7cf4d2'),f)
        #json.dump(get_creature('5ed28cc663a0580dfd7cf4d2'),f)