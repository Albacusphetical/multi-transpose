use tauri::AppHandle;
use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use std::time::Duration;
use lazy_static::lazy_static;
use log::error;
use rodio::{Decoder, OutputStream, source::Source};

#[derive(Debug, Clone, Copy, Eq, Hash, PartialEq)]
pub enum Sound {
    Next,
    Previous,
    Pause,
    Resume
}

pub static mut MUTED: bool = false;
pub static mut VOLUME: f32 = 0.3;
const AUDIO_DIR: &str = "assets/audio";

// sounds
lazy_static! {
    static ref SOUNDS_MAP: HashMap<Sound, &'static str> = {
        let mut map = HashMap::new();
        map.insert(Sound::Next, "SFX_UI_Button_Organic_Plastic_Thin_Select_1.wav");
        map.insert(Sound::Previous, "SFX_UI_Button_Organic_Plastic_Thin_Negative_Back_2.wav");
        map.insert(Sound::Pause, "stop.wav");
        map.insert(Sound::Resume, "resume.wav");

        map
    };
}

pub unsafe fn play_sound(name: Sound, app_handle: AppHandle) {
    if MUTED {
        return;
    }

    std::thread::spawn(move || {
        let mut source = match load_sound(name, app_handle) {
            Some(source) => source,
            None => {
                error!("Sound ({:?}) not found.", name);
                return;
            },
        };

        // Get a output stream handle to the default physical sound device
        let audio_output_device = OutputStream::try_default();

        if let Err(err) = audio_output_device {
            error!("{:?}", err);
            return;
        }

        let (_stream, stream_handle) = audio_output_device.unwrap();

        let mut duration = source.total_duration();
        if duration.is_none() {
            // total_duration is only supported for .wav
            duration = Some(Duration::from_secs(5));
        }
        else {
            // add one second, just in case the audio is less than one second
            duration = duration.unwrap().checked_add(Duration::from_secs(1));
        }

        let volume_source = source.amplify(VOLUME);

        // Play the sound directly on the device
        stream_handle.play_raw(volume_source.convert_samples());

        std::thread::sleep(Duration::from_secs(duration.unwrap().as_secs()));
    });
}

fn load_sound(name: Sound, app_handle: AppHandle) -> Option<Decoder<BufReader<File>>> {
    let filename = SOUNDS_MAP.get(&name);
    if filename.is_none() {
        return None::<Decoder<BufReader<File>>>;
    }

    let path = app_handle.path_resolver().resolve_resource(format!("{}/{}", AUDIO_DIR, filename.unwrap())).unwrap();

    // Load a sound from a file, using a path relative to Cargo.toml
    let file = BufReader::new(File::open(path).unwrap());

    // Decode that sound file into a source
    let source = Some(Decoder::new(file).unwrap());

    source
}
