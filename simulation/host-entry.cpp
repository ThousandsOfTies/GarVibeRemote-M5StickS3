// Node host ABI. Initialize the generic display with gar_lv_init() first.
// gar_app_tick() owns the clock; do not additionally call gar_lv_tick().
#include "DeviceApplication.h"
#include "application_config.h"
#include "gar_board_config.h"
#include <deque>
#include "ButtonMapping.h"
#include "BleUart.h"
#include "ble_profile.h"

namespace {
gar::BleUart ble;
std::deque<std::string> outgoing;
void publish(vibe::Transport link,const std::string& data) {
 JsonDocument d;d["transport"]=vibe::name(link);d["data"]=data;std::string packet;serializeJson(d,packet);outgoing.push_back(packet);
}
void pumpBle() {
 gar::nimble_host::progress();ble.poll();
 while(!gar::nimble_host::notifications.empty()){publish(vibe::Transport::ble,gar::nimble_host::notifications.front());gar::nimble_host::notifications.pop_front();}
}
std::string snapshot,result;
vibe::DeviceApplication::Hardware facts;
vibe::DeviceApplication app(
  {gar_application::device,gar_application::firmware,gar_application::bluetooth_name,gar_application::source_prefix,"ble-numeric-comparison","BでYESを選び、Aで決定してください。"},
  [](vibe::Transport link,const std::string& data) {
    if(link==vibe::Transport::ble)ble.send(data);else publish(link,data);
  }, [](bool accepted) {ble.confirm(accepted);});
uint32_t clockMs=0;
ButtonMapping keys([](char key,int phase){app.button(key,phase);});
vibe::Transport transport(int link) {
  return link==1?vibe::Transport::usb:link==2?vibe::Transport::spp:link==3?vibe::Transport::ble:vibe::Transport::none;
}
}
extern "C" {
void gar_app_init() {
  app.setInputHints({"B:次 A:決定","B長:一覧","B長:戻る","B:次 A:決定","B短押しで次、Aで決定。"});
  facts.width=gar_board::display::width;facts.height=gar_board::display::height;
  facts.battery=82;facts.sppReady=false;app.begin(facts);
  ble.begin({gar_application::bluetooth_name,ble_profile::service,ble_profile::rx,ble_profile::tx},{
    [](const char* bytes,size_t size){app.feed(vibe::Transport::ble,bytes,size);},
    []{app.resetTransport(vibe::Transport::ble);},
    [](uint32_t code){app.pairingRequested(code);},[](bool ok){app.authenticated(ok);}
  });app.step();lv_task_handler();
}
void gar_app_tick(unsigned elapsed) {
  clockMs+=elapsed;keys.tick(clockMs);lv_tick_inc(elapsed);
  pumpBle();facts.bleReady=ble.ready();facts.bleClient=ble.connected();app.hardware(facts);app.step();pumpBle();lv_task_handler();
}
void gar_app_feed_bytes(int link,const char* bytes,unsigned size) {
  if(!bytes)return;
  if(link==3){gar::nimble_host::write(bytes,size);pumpBle();}else app.feed(transport(link),bytes,size);
}
void gar_app_button(int key,int phase) { keys.input(static_cast<char>(key),phase,clockMs); }
void gar_app_hardware(int powered,int battery,int sppReady,int sppClient) {
  facts.powered=powered!=0;facts.battery=battery;facts.sppReady=sppReady!=0;
  facts.sppClient=sppClient!=0;app.hardware(facts);
}
void gar_app_ble_hardware(int ready,int client) {
  if(client){gar::nimble_host::connect();ble.poll();gar::nimble_host::subscribe(true);}else gar::nimble_host::disconnect();
  pumpBle();facts.bleReady=ble.ready();facts.bleClient=ble.connected();app.hardware(facts);
}
void gar_app_ble_event(int event,int value) {
 using namespace gar::nimble_host;
 if(event==0)allowSecurity=value!=0;
 else if(event==1){connect();ble.poll();}
 else if(event==2)authenticate(value!=0);
 else if(event==3)subscribe(value!=0);
 else if(event==4)disconnect();
 else if(event==5){mtu=std::max(23,std::min(value,247));server->callbacks->onMTUChange(mtu,peer);}
 else if(event==6)notifyFailure=value!=0;
 else if(event==7)reset();
 ble.poll();facts.bleReady=ble.ready();facts.bleClient=ble.connected();app.hardware(facts);
}
const char* gar_app_ble_snapshot() {
 JsonDocument d;d["linked"]=gar::nimble_host::linked;d["securityRequested"]=gar::nimble_host::securityRequested;
 d["securityRequests"]=gar::nimble_host::securityRequests;d["encrypted"]=gar::nimble_host::peer.encrypted;
 d["subscribed"]=gar::nimble_host::subscribed;d["ready"]=ble.connected();d["rejectedWrites"]=gar::nimble_host::rejectedWrites;
 result.clear();serializeJson(d,result);return result.c_str();
}
void gar_app_pairing(unsigned code) { if(code<=999999)app.pairingRequested(code); }
void gar_app_authenticated(int success) { app.authenticated(success!=0); }
void gar_app_transport_reset(int link,int mode) {
  if(mode==1)app.discardTransport(transport(link));else app.resetTransport(transport(link));
}
const char* gar_app_snapshot() { snapshot=app.snapshot();return snapshot.c_str(); }
const char* gar_app_take_output() {
  pumpBle();
  result.clear();if(!outgoing.empty()) { result=std::move(outgoing.front());outgoing.pop_front(); }
  return result.c_str();
}
}
