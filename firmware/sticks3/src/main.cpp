// Product composition: board I/O -> portable application. No pin/driver facts.
#include <Arduino.h>
#include "GarStickS3.h"
#include "DeviceApplication.h"
#include "application_config.h"
#include "ButtonMapping.h"
#include "IdleBacklight.h"
#include "BleUart.h"
#include "ble_profile.h"

namespace {
namespace board = gar::sticks3;
namespace config = gar_application;
gar::BleUart ble;
vibe::IdleBacklight backlight(config::brightness,8);
uint8_t lastBrightness=config::brightness;
vibe::Transport transport(board::Link link) {
  return vibe::Transport::usb;
}
vibe::DeviceApplication::Hardware facts(const board::Hardware& hardware) {
  vibe::DeviceApplication::Hardware value{hardware.powered,false,false,
          hardware.battery,hardware.width,hardware.height,hardware.board};
  value.charging=hardware.charging;return value;
}
vibe::DeviceApplication app(
  {config::device,config::firmware,config::bluetooth_name,config::source_prefix,"ble-numeric-comparison","BでYESを選び、Aで決定してください。"},
  [](vibe::Transport link,const std::string& bytes) {
    if(link==vibe::Transport::ble)ble.send(bytes);
    else if(link==vibe::Transport::usb)board::send(board::Link::usb,bytes);
  },[](bool accepted){ble.confirm(accepted);});
ButtonMapping keys([](char key,int phase){app.button(key,phase);});
}
void setup() {
  board::begin({config::rotation,config::brightness},{
    [](board::Link link,const char* bytes,size_t size) {app.feed(transport(link),bytes,size);},
    [](board::Link link,bool discard) {
      if(discard)app.discardTransport(transport(link));else app.resetTransport(transport(link));
    },
    [](char key,int phase) {if(!backlight.button(key,phase,millis()))keys.input(key,phase,millis());},
    [](const board::Hardware& hardware) {auto value=facts(hardware);value.bleReady=ble.ready();value.bleClient=ble.connected();app.hardware(value);},
    [](const int16_t* data,size_t count){app.voiceAudio(data,count);}
  });
  app.setInputHints({"B:次 A:決定","B長:一覧","B長:戻る","B:次 A:決定","B短押しで次、Aで決定。"});
  app.begin(facts(board::hardware()));
  app.enableVoice(board::audioBuffer(160000),160000,[](bool enabled){return board::microphone(enabled);});
  ble.begin({config::bluetooth_name,ble_profile::service,ble_profile::rx,ble_profile::tx},{
    [](const char* bytes,size_t size){app.feed(vibe::Transport::ble,bytes,size);},
    []{app.resetTransport(vibe::Transport::ble);},
    [](uint32_t number){app.pairingRequested(number);},
    [](bool ok){app.authenticated(ok);}
  });
}
void loop() {
  board::poll();auto value=facts(board::hardware());value.bleReady=ble.ready();value.bleClient=ble.connected();
  app.hardware(value);ble.poll();keys.tick(millis());app.step();
  backlight.tick(millis(),app.allSessionsIdle());
  if(backlight.brightness()!=lastBrightness){lastBrightness=backlight.brightness();board::setBrightness(lastBrightness);}
  lv_task_handler();delay(5);
}
