<template>
  <div class="relative size-full">
    <!-- antenna -->
    <div class="absolute left-1/2 top-8.5 size-0">
      <div class="error-tv-antenna-pole rotate-26">
        <div class="error-tv-antenna-tip"></div>
      </div>
      <div class="error-tv-antenna-pole rotate-[-26deg]">
        <div class="error-tv-antenna-tip"></div>
      </div>
    </div>

    <!-- tv body -->
    <div class="error-tv-body">
      <!-- screen -->
      <div class="error-tv-screen">
        <div class="error-tv-screen-inner">
          <div
            class="error-tv-snow absolute inset-0 animate-ple-snow motion-reduce:animate-none"
          ></div>
          <div class="error-tv-scanlines absolute inset-0"></div>
          <div
            class="error-tv-roll absolute inset-x-0 h-7.5 animate-ple-roll motion-reduce:animate-none"
          ></div>
          <div class="error-tv-vignette absolute inset-0"></div>
        </div>
      </div>

      <!-- control panel -->
      <div class="flex w-9 flex-col items-center gap-2 pt-1.5">
        <div class="error-tv-knob"></div>
        <div class="error-tv-knob"></div>
        <div class="mt-1 flex w-6 flex-col gap-0.75">
          <div class="error-tv-slot"></div>
          <div class="error-tv-slot"></div>
          <div class="error-tv-slot"></div>
          <div class="error-tv-slot"></div>
        </div>
      </div>
    </div>

    <!-- feet -->
    <div class="error-tv-foot error-tv-foot--left"></div>
    <div class="error-tv-foot error-tv-foot--right"></div>
  </div>
</template>
