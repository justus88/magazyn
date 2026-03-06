<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        $existing = DB::table('users')->where('email', 'justusque@gmail.com')->first();

        if ($existing) {
            DB::table('users')
                ->where('email', 'justusque@gmail.com')
                ->update([
                    'name' => 'Mateusz',
                    'password' => Hash::make('30Pejotserwis!'),
                    'updated_at' => now(),
                ]);
        } else {
            DB::table('users')->insert([
                'name' => 'Mateusz',
                'email' => 'justusque@gmail.com',
                'password' => Hash::make('30Pejotserwis!'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        //
    }
};
