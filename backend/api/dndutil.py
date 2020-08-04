import random

def roll(rollstr,adv=0):
    if adv == 1 or adv == -1:
        rolls = []
        for i in range(2):
            if not 'd' in rollstr:
                raise ValueError('Please use the format xdy[+z], i.e. 4d10+5')

            if '+' in rollstr:
                mod = int(rollstr.split('+')[1])
                roll = rollstr.split('+')[0]
            elif '-' in rollstr:
                mod = -1*int(rollstr.split('-')[1])
                roll = rollstr.split('-')[0]
            else:
                mod = 0
                roll = rollstr
            
            rs = roll.split('d')
            if rs[0] == '':
                rolls.append(random.randint(0,int(rs[1])) + mod)
            else:
                val = 0
                for i in range(int(rs[0])):
                    v = random.randint(0,int(rs[1]))
                    val += v
                rolls.append(val+mod)
        sortedrolls = sorted(rolls)
        if adv == 1:
            return sortedrolls[1]
        else:
            return sortedrolls[0]
    else:
        if not 'd' in rollstr:
            raise ValueError('Please use the format xdy[+z], i.e. 4d10+5')

        if '+' in rollstr:
            mod = int(rollstr.split('+')[1])
            roll = rollstr.split('+')[0]
        elif '-' in rollstr:
            mod = -1*int(rollstr.split('-')[1])
            roll = rollstr.split('-')[0]
        else:
            mod = 0
            roll = rollstr
        
        rs = roll.split('d')
        if rs[0] == '':
            return random.randint(0,int(rs[1])) + mod
        else:
            val = 0
            for i in range(int(rs[0])):
                v = random.randint(0,int(rs[1]))
                val += v
            return val+mod

def getmod(score):
    score = int(score)
    if score > 0 and score < 31:
        return [
            -5,
            -4,
            -4,
            -3,
            -3,
            -2,
            -2,
            -1,
            -1,
            0,
            0,
            1,
            1,
            2,
            2,
            3,
            3,
            4,
            4,
            5,
            5,
            6,
            6,
            7,
            7,
            8,
            8,
            9,
            9,
            10
        ][score-1]
    else:
        return 0
