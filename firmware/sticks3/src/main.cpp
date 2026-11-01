// Product composition: board I/O -> portable application. No pin/driver facts.
#include <Arduino.h>
#include "GarStickS3.h"
#include "DeviceApplication.h"
#include "application_config.h"
#include "ButtonMapping.h"

namespace {
namespace board = gar::sticks3;
namespace config = gar_application;
vibe::Transport transport(board::Link link) {
  return vibe::Transport::usb;
}
vibe::DeviceApplication::Hardware facts(const board::Hardware& hardware) {
  return {hardware.powered,hardware.sppReady,hardware.sppClient,
          hardware.battery,hardware.width,hardware.height,hardware.board};
}
vibe::DeviceApplication app(
  {config::device,config::firmware,config::bluetooth_name,config::source_prefix},
  [](vibe::Transport link,const std::string& bytes) {
    if(link!=vibe::Transport::none)board::send(board::Link::usb,bytes);
  },board::confirmPairing);
ButtonMapping keys([](char key,int phase){app.button(key,phase);});
}
void setup() {
  board::begin({config::bluetooth_name,config::rotation,config::brightness},{
    [](board::Link link,const char* bytes,size_t size) {app.feed(transport(link),bytes,size);},
    [](board::Link link,bool discard) {
      if(discard)app.discardTransport(transport(link));else app.resetTransport(transport(link));
    },
    [](char key,int phase) {keys.input(key,phase,millis());},
    [](uint32_t number) {app.pairingRequested(number);},
    [](bool success) {app.authenticated(success);},
    [](const board::Hardware& hardware) {app.hardware(facts(hardware));}
  });
  app.setInputHints({"B:次 A:決定","B長:一覧","B長:戻る","B:次 A:決定","B短押しで次、Aで決定。"});
  app.begin(facts(board::hardware()));
}
void loop() {board::poll();keys.tick(millis());app.step();lv_task_handler();delay(5);}
