#pragma once
#include <cstdint>
#include <functional>
// Product policy: two physical keys -> existing application input contract.
class ButtonMapping {
 public:
  using Emit=std::function<void(char,int)>;
  explicit ButtonMapping(Emit emit):emit_(emit){}
  void input(char key,int phase,uint32_t now) {
    if(key=='A'){
      if(phase==1 && !aDown_){aDown_=true;aLong_=false;aAt_=now;emit_('A',1);}
      else if(phase!=1 && aDown_){if(phase==0)tick(now);aDown_=false;emit_(aLong_?'V':'A',phase);}
      return;
    }
    if(key!='B')return;
    if(phase==1 && !down_){down_=true;long_=false;at_=now;emit_('C',1);}
    else if(phase!=1 && down_){if(phase==0)tick(now);down_=false;if(!long_)emit_('C',phase);}
  }
  void tick(uint32_t now) {
    if(aDown_ && !aLong_ && uint32_t(now-aAt_)>=700){aLong_=true;emit_('A',-1);emit_('V',1);}
    if(down_ && !long_ && uint32_t(now-at_)>=700){
      long_=true;emit_('C',-1);emit_('B',1);emit_('B',0);
    }
  }
 private:
  Emit emit_;uint32_t at_=0,aAt_=0;bool down_=false,long_=false,aDown_=false,aLong_=false;
};
