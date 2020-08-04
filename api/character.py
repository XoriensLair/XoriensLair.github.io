#from api.avrae.cogs5e.sheets.beyond import getJSON as beyond_getJSON
from api.avrae.cogs5e.sheets.gsheet import getJSON_gsheet as gsheet_getJSON
import json
from api.dndutil import *

def get_mod(score):
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

class Character:
    def __init__(self,gurl=None,_json=None):
        if gurl:
            self.chardata = json.loads(gsheet_getJSON(gurl))
        else:
            if type(_json) == str:
                self.chardata = json.loads(_json)
            else:
                self.chardata = _json
        for key in list(self.chardata['stats'].keys()):
            if key != 'prof_bonus':
                self['stats'][key+'_bonus'] = get_mod(self['stats'][key])
    
    def __getitem__(self,item):
        return self.chardata[item]

    def __setitem__(self,index,value):
        self.chardata[index] = value

    def to_json(self):
        return json.dumps(self.chardata)

    def save(self,saving_throw):
        return roll('d20',adv=self['saves'][saving_throw.lower()+'Save']['adv'])+self['saves'][saving_throw.lower()+'Save']['value']
    
    def score_check(self,score):
        return roll('d20')+self['stats'][score.lower()+'_bonus']

    def skill_check(self,skill):
        return roll('d20',adv=self['skills'][skill.lower()]['adv'])+self['skills'][skill.lower()]['value']

    def initiative(self):
        return self.skill_check('initiative')
